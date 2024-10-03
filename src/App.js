import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// ERC20 ABI for the approve function
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)"
];

const App = () => {
  const [quotes, setQuotes] = useState([]);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [swapStatus, setSwapStatus] = useState('idle');
  const [swapParams, setSwapParams] = useState({
    chainId: 8453,
    slippage: 0.5,
    amount: 0,
    tokenIn: '',
    tokenOut: '',
    sender: '',
    receiver: ''
  });
  const [isConnected, setIsConnected] = useState(false);
  const [approvalTx, setApprovalTx] = useState(null);
  const [swapTx, setSwapTx] = useState(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.listAccounts();
      setIsConnected(accounts.length > 0);
      if (accounts.length > 0) {
        setSwapParams(prev => ({ ...prev, sender: accounts[0], receiver: accounts[0] }));
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setIsConnected(true);
        setSwapParams(prev => ({ ...prev, sender: accounts[0], receiver: accounts[0] }));
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    } else {
      alert('Please install MetaMask!');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSwapParams(prev => ({
      ...prev,
      [name]: name === 'chainID' || name === 'slippage' ? Number(value) : value
    }));
  };

  const fetchBestQuotes = async () => {
    try {
      setApprovalTx(null);
      setSwapTx(null);
      const response = await fetch('http://localhost:4000/best-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(swapParams),
      });
      const data = await response.json();
      setQuotes(data);
      setCurrentQuoteIndex(0);
      setSwapStatus('idle');
    } catch (error) {
      console.error('Failed to fetch best quotes:', error);
    }
  };

  const handleApproval = async (quote) => {
    setSwapStatus('approving');
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      if (swapParams.tokenIn.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        console.log('Token is ETH, no approval needed');
        return true;
      }

      const tokenContract = new ethers.Contract(swapParams.tokenIn, ERC20_ABI, signer);
      
      const approvalAmount = ethers.utils.parseEther(swapParams.amount);
      const tx = await tokenContract.approve(quote.approvalAddress, approvalAmount);
      
      await tx.wait();
      
      setApprovalTx({
        hash: tx.hash,
        from: await signer.getAddress(),
        to: swapParams.tokenIn,
        data: tx.data
      });
      return true;
    } catch (error) {
      console.error('Approval failed:', error);
      return false;
    }
  };

  const handleSwap = async (quote) => {
    setSwapStatus('swapping');
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      const tx = await signer.sendTransaction({
        to: quote.to,
        data: quote.data,
        value: quote.value
      });
      await tx.wait();
      setSwapTx({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        data: tx.data
      });
      setSwapStatus('success');
      return true;
    } catch (error) {
      console.error('Swap failed:', error);
      setSwapStatus('failed');
      return false;
    }
  };

  const tryNextQuote = async () => {
    setApprovalTx(null);
    setSwapTx(null);
    
    if (currentQuoteIndex >= quotes.length) {
      console.log('All quotes have been tried. Fetching new quotes.');
      setSwapStatus('idle');
      return;
    }

    const currentQuote = quotes[currentQuoteIndex];
    
    const approvalNeeded = swapParams.tokenIn.toLowerCase() !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    
    if (approvalNeeded) {
      const approvalSuccess = await handleApproval(currentQuote);
      if (!approvalSuccess) {
        setCurrentQuoteIndex(prevIndex => prevIndex + 1);
        tryNextQuote();
        return;
      }
    }

    const swapSuccess = await handleSwap(currentQuote);
    if (!swapSuccess) {
      setCurrentQuoteIndex(prevIndex => prevIndex + 1);
      tryNextQuote();
    }
  };

  return (
    <div>
      <h1>Best Quote Swap</h1>
      {!isConnected ? (
        <button onClick={connectWallet}>Connect MetaMask</button>
      ) : (
        <>
          <form onSubmit={(e) => { e.preventDefault(); fetchBestQuotes(); }}>
            <input
              type="number"
              name="chainID"
              value={swapParams.chainID}
              onChange={handleInputChange}
              placeholder="Chain ID"
            />
            <input
              type="number"
              name="slippage"
              value={swapParams.slippage}
              onChange={handleInputChange}
              placeholder="Slippage (%)"
              step="0.1"
            />
            <input
              type="text"
              name="amount"
              value={swapParams.amount}
              onChange={handleInputChange}
              placeholder="Amount"
            />
            <input
              type="text"
              name="tokenIn"
              value={swapParams.tokenIn}
              onChange={handleInputChange}
              placeholder="Token In Address"
            />
            <input
              type="text"
              name="tokenOut"
              value={swapParams.tokenOut}
              onChange={handleInputChange}
              placeholder="Token Out Address"
            />
            <input
              type="text"
              name="sender"
              value={swapParams.sender}
              onChange={handleInputChange}
              placeholder="Sender Address"
            />
            <input
              type="text"
              name="receiver"
              value={swapParams.receiver}
              onChange={handleInputChange}
              placeholder="Receiver Address"
            />
            <button type="submit">Get Best Quote</button>
          </form>
          <button onClick={tryNextQuote} disabled={swapStatus !== 'idle' && swapStatus !== 'failed'}>
            Swap
          </button>
          <p>Status: {swapStatus}</p>
          
          {quotes.length > 0 && (
            <div>
              <h2>Best Quotes</h2>
              <ul>
                {quotes.map((quote, index) => (
                  <li key={index}>
                    Protocol: {quote.protocol}, Amount Out: {quote.amountOut}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {approvalTx && (
            <div>
              <h2>Approval Transaction</h2>
              <p>Hash: {approvalTx.hash}</p>
              <p>From: {approvalTx.from}</p>
              <p>To: {approvalTx.to}</p>
              <p>Data: {approvalTx.data}</p>
            </div>
          )}
          
          {swapTx && (
            <div>
              <h2>Swap Transaction</h2>
              <p>Hash: {swapTx.hash}</p>
              <p>From: {swapTx.from}</p>
              <p>To: {swapTx.to}</p>
              <p>Data: {swapTx.data}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default App;