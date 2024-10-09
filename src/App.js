import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';

// ERC20 ABI for the approve function
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)"
];

const App = () => {
  const [formData, setFormData] = useState({
    chainId: 8453,
    slippage: 0.1,
    amount: '',
    tokenIn: '',
    tokenOut: '',
    sender: '',
    receiver: ''
  });
  const [quotes, setQuotes] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [approvalReceipts, setApprovalReceipts] = useState({});
  const [transactionReceipts, setTransactionReceipts] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState('');

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  const checkIfWalletIsConnected = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setIsConnected(true);
          setAccount(accounts[0]);
        }
      } catch (error) {
        console.error("An error occurred while checking the wallet connection:", error);
      }
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setIsConnected(true);
        setAccount(accounts[0]);
      } catch (error) {
        console.error("An error occurred while connecting the wallet:", error);
        setError("Failed to connect wallet: " + error.message);
      }
    } else {
      setError("MetaMask is not installed. Please install it to use this app.");
    }
  };

  const clearData = () => {
    setQuotes([]);
    setStatus('idle');
    setError(null);
    setApprovalReceipts({});
    setTransactionReceipts({});
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isConnected) {
      setError("Please connect your wallet first.");
      return;
    }
    clearData();
    setStatus('fetching quotes');
    try {
      const response = await axios.post('http://localhost:4000/best-quotes', {
        ...formData,
        chainId: formData.chainId ? parseInt(formData.chainId) : '',
        slippage: formData.slippage ? parseFloat(formData.slippage) : 0.1,
      });
      setQuotes(response.data);
      setStatus('idle');
    } catch (error) {
      console.error('Error fetching quotes:', error);
      setError('Error fetching quotes: ' + error.message);
      setStatus('error');
    }
  };

  const handleApproval = async (quote, index) => {
    if (!isConnected) {
      setError("Please connect your wallet first.");
      return;
    }
    
    if (formData.tokenIn.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      console.log('Token is ETH, proceeding directly to swap');
      handleSwap(quote, index);
      return;
    }
  
    setStatus(`approving-${index}`);
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
  
      const tokenContract = new ethers.Contract(formData.tokenIn, ERC20_ABI, signer);
      
      const approvalAmount = ethers.utils.parseEther(formData.amount.toString());
      const tx = await tokenContract.approve(quote.approvalAddress, approvalAmount);
      
      setStatus(`waiting-approval-${index}`);
      const receipt = await tx.wait();
      
      const signerAddress = await signer.getAddress();
      
      setApprovalReceipts(prev => ({
        ...prev,
        [index]: {
          hash: receipt.transactionHash,
          from: signerAddress,
          to: formData.tokenIn,
          blockNumber: receipt.blockNumber
        }
      }));
      console.log('Approval successful');
      setStatus('idle');
    } catch (error) {
      console.error('Approval failed:', error);
      if (error.code === 4001) {
        setError('Approval rejected by user.');
      } else {
        setError('Approval failed: ' + error.message);
      }
      setStatus('idle');
    }
  };

  const handleSwap = async (quote, index) => {
    if (!isConnected) {
      setError("Please connect your wallet first.");
      return;
    }
    setStatus(`swapping-${index}`);
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      const tx = await signer.sendTransaction({
        to: quote.to,
        data: quote.data,
        value: ethers.BigNumber.from(quote.value),
        gasLimit: 8000000 // Added gas limit of 8000000
      });
      
      setStatus(`waiting-${index}`);
      const receipt = await tx.wait();
      
      setTransactionReceipts(prev => ({
        ...prev,
        [index]: {
          hash: receipt.transactionHash,
          from: receipt.from,
          to: receipt.to,
          blockNumber: receipt.blockNumber
        }
      }));
      setStatus('swap successful');
    } catch (error) {
      console.error('Swap failed:', error);
      if (error.code === 4001) {
        setError('Swap rejected by user.');
      } else {
        setError('Swap failed: ' + error.message);
      }
      setStatus('idle');
    }
  };

  return (
    <div className="App">
      <h1>Best Quote Swap</h1>
      {!isConnected ? (
        <button onClick={connectWallet}>Connect to MetaMask</button>
      ) : (
        <p>Connected Account: {account}</p>
      )}
      <form onSubmit={handleSubmit}>
        <input
          type="number"
          name="chainId"
          value={formData.chainId}
          onChange={handleChange}
          placeholder="Chain ID"
        />
        <input
          type="number"
          name="slippage"
          value={formData.slippage}
          onChange={handleChange}
          placeholder="Slippage (%)"
          step="0.1"
        />
        <input
          type="text"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          placeholder="Amount"
        />
        <input
          type="text"
          name="tokenIn"
          value={formData.tokenIn}
          onChange={handleChange}
          placeholder="Token In Address"
        />
        <input
          type="text"
          name="tokenOut"
          value={formData.tokenOut}
          onChange={handleChange}
          placeholder="Token Out Address"
        />
        <input
          type="text"
          name="sender"
          value={formData.sender}
          onChange={handleChange}
          placeholder="Sender Address"
        />
        <input
          type="text"
          name="receiver"
          value={formData.receiver}
          onChange={handleChange}
          placeholder="Receiver Address"
        />
        <button type="submit" disabled={!isConnected}>Get Best Quote</button>
      </form>

      <p>Status: {status}</p>
      {error && <p className="error">{error}</p>}

      {quotes.length > 0 && (
        <div>
          <h2>Quotes:</h2>
          <ul>
            {quotes.map((quote, index) => (
              <li key={index}>
                <p>Protocol: {quote.protocol}</p>
                <p>Amount Out: {quote.amountOut}</p>
                <p>Price Impact: {parseFloat(quote.priceImpactPercentage).toFixed(2)}%</p>
                {quote.message ? (
                  <p className="quote-message">{quote.message}</p>
                ) : (
                  <>
                    <button 
                      onClick={() => handleApproval(quote, index)} 
                      disabled={!isConnected || status.startsWith('approving') || status.startsWith('swapping') || formData.tokenIn.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'}
                    >
                      {formData.tokenIn.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ? 'No Approval Needed' : 'Approve'}
                    </button>
                    <button 
                      onClick={() => handleSwap(quote, index)} 
                      disabled={!isConnected || status.startsWith('approving') || status.startsWith('swapping') || (!approvalReceipts[index] && formData.tokenIn.toLowerCase() !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')}
                    >
                      Swap
                    </button>
                    {approvalReceipts[index] && (
                      <div>
                        <h3>Approval Receipt</h3>
                        <p>Hash: {approvalReceipts[index].hash}</p>
                        <p>From: {approvalReceipts[index].from}</p>
                        <p>To: {approvalReceipts[index].to}</p>
                        <p>Block Number: {approvalReceipts[index].blockNumber}</p>
                      </div>
                    )}
                    {transactionReceipts[index] && (
                      <div>
                        <h3>Swap Receipt</h3>
                        <p>Hash: {transactionReceipts[index].hash}</p>
                        <p>From: {transactionReceipts[index].from}</p>
                        <p>To: {transactionReceipts[index].to}</p>
                        <p>Block Number: {transactionReceipts[index].blockNumber}</p>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default App;