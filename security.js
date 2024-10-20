const crypto = require('crypto');

// Class representing a Transaction
class Transaction {
    constructor(fromAddress, toAddress, amount) {
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
        this.timestamp = Date.now();
        this.signature = '';
    }

    // Generate a hash for the transaction
    calculateHash() {
        return crypto.createHash('sha256').update(this.fromAddress + this.toAddress + this.amount + this.timestamp).digest('hex');
    }

    // Sign the transaction with a private key
    signTransaction(signingKey) {
        if (signingKey.getPublic('hex') !== this.fromAddress) {
            throw new Error('Cannot sign transactions for other wallets!');
        }

        const hashTx = this.calculateHash();
        const sig = signingKey.sign(hashTx, 'base64');
        this.signature = sig.toDER('hex');
    }

    // Verify if the transaction is properly signed
    isValid() {
        if (this.fromAddress === null) return true; // Transactions with no sender (e.g., mining rewards) don't need signatures

        if (!this.signature || this.signature.length === 0) {
            throw new Error('No signature in this transaction');
        }

        const publicKey = crypto.createECDH('secp256k1');
        publicKey.setPublicKey(Buffer.from(this.fromAddress, 'hex'));
        return publicKey.verify(this.calculateHash(), Buffer.from(this.signature, 'hex'));
    }
}

// Block that contains transactions
class Block {
    constructor(timestamp, transactions, previousHash = '') {
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.nonce = 0;
        this.hash = this.calculateHash();
    }

    // Generate the block hash
    calculateHash() {
        return crypto.createHash('sha256').update(this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce).digest('hex');
    }

    // Mine a block (Proof of Work)
    mineBlock(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log(`Block mined: ${this.hash}`);
    }

    // Validate transactions within the block
    hasValidTransactions() {
        for (const tx of this.transactions) {
            if (!tx.isValid()) {
                return false;
            }
        }
        return true;
    }
}

// Blockchain protected from tampering
class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 4;  // Mining difficulty level
        this.pendingTransactions = [];
        this.miningReward = 100;
    }

    // Create the initial block (Genesis block)
    createGenesisBlock() {
        return new Block(Date.now(), [], "0");
    }

    // Retrieve the latest block
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    // Mine all pending transactions and reward the miner
    minePendingTransactions(miningRewardAddress) {
        const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward);
        this.pendingTransactions.push(rewardTx);

        const block = new Block(Date.now(), this.pendingTransactions, this.getLatestBlock().hash);
        block.mineBlock(this.difficulty);

        console.log('Block successfully mined!');
        this.chain.push(block);

        this.pendingTransactions = [];
    }

    // Add a transaction to the pool
    addTransaction(transaction) {
        if (!transaction.fromAddress || !transaction.toAddress) {
            throw new Error('Transaction must include from and to address');
        }

        if (!transaction.isValid()) {
            throw new Error('Cannot add invalid transaction to chain');
        }

        this.pendingTransactions.push(transaction);
    }

    // Validate the blockchain
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (!currentBlock.hasValidTransactions()) {
                return false;
            }

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }
}

// Example usage
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

// Generate keys for testing
const myKey = ec.genKeyPair();
const myWalletAddress = myKey.getPublic('hex');

// Create blockchain
let myBlockchain = new Blockchain();

// Create and sign a transaction
const tx1 = new Transaction(myWalletAddress, 'recipient public key here', 10);
tx1.signTransaction(myKey);
myBlockchain.addTransaction(tx1);

// Start mining
console.log('\nStarting the mining process...');
myBlockchain.minePendingTransactions(myWalletAddress);

// Validate the chain
console.log('Blockchain valid?', myBlockchain.isChainValid());
