import React, { useState } from 'react';
import {
    ConnectionProvider,
    WalletProvider,
    useWallet
} from '@solana/wallet-adapter-react';
import {
    PhantomWalletName,
    PhantomWalletAdapter
} from '@solana/wallet-adapter-phantom';
import { clusterApiUrl, Connection, VersionedTransaction } from '@solana/web3.js';
import {Buffer} from 'buffer';

const Quotes = () => {
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [params, setParams] = useState({
        slippage: '',
        amount: '',
        tokenIn: '',
        tokenOut: '',
        sender: ''
    });
    const { publicKey, connected, disconnect, select, wallet } = useWallet();
    const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=7ea8c2f9-658e-4675-9858-6a2a51aee843', 'confirmed');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setParams((prevParams) => ({ ...prevParams, [name]: value }));
    };

    const fetchQuotes = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:4000/getQuote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...params, sender: publicKey.toString() }),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            setQuotes(data);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        fetchQuotes();
    };

    const executeTransaction = async (swapData) => {
        if (!connected) {
            alert('Please connect your wallet first.');
            return;
        }

        try {
            const { solana } = window;

            console.log("__________________________", solana.isPhantom)


             const swapTransactionBuf = Buffer.from(swapData, 'base64');
             var transaction = VersionedTransaction.deserialize(swapTransactionBuf);
             console.log("___________________________________________wallet",wallet)
             console.log(wallet.adapter.signTransaction)
             const signedTransaction = await wallet.adapter.signTransaction(transaction)
             // Send the transaction

             const latestBlockHash = await connection.getLatestBlockhash();


             console.log(latestBlockHash)

             // Execute the transactionp.
             const rawTransaction = transaction.serialize()
             const txid = await connection.sendRawTransaction(rawTransaction, {
               skipPreflight: true,
               maxRetries: 2
             });
             await connection.confirmTransaction({
               blockhash: latestBlockHash.blockhash,
               lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
               signature: txid
             });
             
 
             console.log('Transaction successful with signature:', txid);
        } catch (error) {
            console.error('Transaction failed:', error);
        }
    };

    const handleSwap = (quote) => {
        executeTransaction(quote.swapData);
    };

    const handleConnect = async () => {
        try {
            await select(PhantomWalletName); // Select the Phantom wallet
        } catch (error) {
            console.error('Connection failed:', error);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h1>Get Quotes</h1>
            {!connected ? (
                <button onClick={handleConnect}>Connect to Phantom Wallet</button> 
            ) : (
                <div>
                    <p>Connected: {publicKey.toString()}</p>
                    <button onClick={disconnect}>Disconnect</button>
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <input
                    type="number"
                    name="slippage"
                    value={params.slippage}
                    onChange={handleChange}
                    placeholder="Slippage"
                    required
                />
                <input
                    type="number"
                    name="amount"
                    value={params.amount}
                    onChange={handleChange}
                    placeholder="Amount"
                    required
                />
                <input
                    type="text"
                    name="tokenIn"
                    value={params.tokenIn}
                    onChange={handleChange}
                    placeholder="Token In"
                    required
                />
                <input
                    type="text"
                    name="tokenOut"
                    value={params.tokenOut}
                    onChange={handleChange}
                    placeholder="Token Out"
                    required
                />
                <button type="submit">Get Quotes</button>
            </form>
            <ul>
                {quotes.map((quote, index) => (
                    <li key={index}>
                        {JSON.stringify(quote)}
                        <button onClick={() => handleSwap(quote)}>Swap</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// Main App Component
const App = () => {
    const endpoint = clusterApiUrl('mainnet-beta'); // Change to 'mainnet-beta' for mainnet
    const wallets = [new PhantomWalletAdapter()];

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <Quotes />
            </WalletProvider>
        </ConnectionProvider>
    );
};

export default App;