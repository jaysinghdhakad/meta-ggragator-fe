import React, { useState, useEffect } from 'react';
import { usePrivy, useLogin } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import {Connection, VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';

const Quotes = () => {
    const [transactionHashes, setTransactionHashes] = useState(null);
    const [logInn, setLogInn] = useState(false)
    const [walletConnected, setWalletConnected] = useState(false)
    const { wallets } = useSolanaWallets();


    const { connectWallet, authenticated, ConnectedWallet, ready, logout } = usePrivy()
    useEffect(() => {
        if (ready && authenticated) {

            setLogInn(true);
        }
    }, [ready, authenticated, setLogInn]);

    const { login } = useLogin({
        onComplete: () => setLogInn(true),
    });

    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [params, setParams] = useState({
        slippage: '',
        amount: '',
        tokenIn: '',
        tokenOut: '',
        sender: '',
        priorityFee: ''
    });
    const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=7ea8c2f9-658e-4675-9858-6a2a51aee843', 'confirmed');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setParams((prevParams) => ({ ...prevParams, [name]: value }));
    };

    const fetchQuotes = async () => {
        setLoading(true);
        setError(null);
        setQuotes(null);
        setTransactionHashes(null);
        try {
            console.log({ ...params })
            const response = await fetch('https://bsccentral.velvetdao.xyz/getQuote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...params, sender: wallets[0].address }),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            setQuotes([data]);
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
        if (!walletConnected) {
            alert('Please connect your wallet first.');
            return;
        }

        try {


            const swapTransactionBuf = Buffer.from(swapData, 'base64');
            var transaction = VersionedTransaction.deserialize(swapTransactionBuf);

            const signedTransaction = await wallets[0].signTransaction(transaction)
            // Send the transaction

            const latestBlockHash = await connection.getLatestBlockhash();

            // Execute the transactionp.
            const rawTransaction = signedTransaction.serialize()
            const txid = await connection.sendRawTransaction(rawTransaction, {
                skipPreflight: true,
                maxRetries: 10
            });
            await connection.confirmTransaction({
                blockhash: latestBlockHash.blockhash,
                lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
                signature: txid
            });


            console.log('Transaction successful with signature:', txid);

            return txid
        } catch (error) {
            console.error('Transaction failed:', error);
        }
    };

    const handleSwap = async (quote) => {
        try {
            setTransactionHashes(() => ({
                [quote.provider]: "swapping",
            }));
            const txid = await executeTransaction(quote.swapData);
            if (txid) {
                setTransactionHashes((prevHashes) => ({
                    [quote.provider]: txid,
                }));
            } else {
                setTransactionHashes((prevHashes) => ({
                    [quote.provider]: 'Transaction failed',
                }));
            }
        } catch (error) {
            setTransactionHashes((prevHashes) => ({
                [quote.provider]: `Error: ${error.message}`,
            }));
        }
    };

    const handleConnect = async () => {
        try {
            connectWallet()
            setWalletConnected(true)
            console.log("__________________________________", wallets[0])
        } catch (error) {
            console.error('Connection failed:', error);
        }
    };

    const handleLogin = async () => {
        try {
            ready && authenticated ? setLogInn(true) : setLogInn(false);
            login(); // Call the login function
            setLogInn(true); // Update the login state
        } catch (error) {
            console.error('Login failed:', error);
        }
    };
    const handleDisconnect = async () => {
        wallets[0].disconnect();
        setLogInn(false)
    }
    const handleLogout = async ()=> {
        logout();
        setLogInn(false);
    }
    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h1>Get Quotes</h1>
            {!logInn ? <button onClick={handleLogin}>Login</button> : <button onClick={handleLogout}>Logout</button>}
            {logInn ? !walletConnected ? (
                <button onClick={handleConnect}>Connect to Phantom Wallet</button>
            ) : (
                <div>
                    <p>Connected: {wallets[0].address.toString()}</p>
                    <button onClick={handleDisconnect}>Disconnect</button>
                </div>
            ) : <div> </div>}
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
                <input
                    type="number"
                    name="priorityFee"
                    value={params.priorityFee}
                    onChange={handleChange}
                    placeholder="priorityFee"
                    required
                />
                <button type="submit">Get Quotes</button>
            </form>
            <ul>
                {quotes.map((quote, index) => (
                    <li key={index}>
                        <div>
                            <strong>Provider:</strong> {quote.provider}
                        </div>
                        <div>
                            <strong>Amount Out:</strong> {quote.quote.amountOut}
                        </div>
                        <div>
                            <strong>Price Impact:</strong> {quote.quote.priceImpact}%
                        </div>
                        {transactionHashes && transactionHashes[quote.provider] && (
                            <div>
                                <strong>Transaction Status:</strong>{' '}
                                {transactionHashes[quote.provider].startsWith('Error')
                                    ? <span style={{ color: 'red' }}>{transactionHashes[quote.provider]}</span>
                                    : <a href={`https://explorer.solana.com/tx/${transactionHashes[quote.provider]}`} target="_blank" rel="noopener noreferrer">
                                        {transactionHashes[quote.provider]}
                                    </a>}
                            </div>
                        )}
                        <button onClick={() => handleSwap(quote)}>Swap</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// Main App Component
const App = () => {

    return (
        <Quotes />
    );
};

export default App;