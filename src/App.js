import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';

function App() {
  const [formData, setFormData] = useState({
    chainId: '',
    slippage: 0.1,
    amount: 1000000,
    tokenIn: '',
    tokenOut: '',
    sender: '',
    receiver: ''
  });
  const [quote, setQuote] = useState(null);
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [error, setError] = useState(null);
  const [approvalReceipt, setApprovalReceipt] = useState(null);
  const [transactionReceipt, setTransactionReceipt] = useState(null);


  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  const checkIfWalletIsConnected = async () => {
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(provider);
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setFormData(prev => ({ ...prev, sender: accounts[0] }));
        }
      } catch (error) {
        console.error("An error occurred while connecting to MetaMask", error);
      }
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        setFormData(prev => ({ ...prev, sender: accounts[0] }));
      } catch (error) {
        console.error("User denied account access", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const clearData = () => {
    setQuote(null);
    setError(null);
    setApprovalReceipt(null);
    setTransactionReceipt(null);
  };

  const handleError = (message) => {
    setError(message);
    // Optionally, you can set a timeout to clear the error after a few seconds
    setTimeout(() => setError(null), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearData(); // Clear previous data
    try {
      const response = await axios.post('https://bsccentral.velvetdao.xyz/best-quote', {
        ...formData,
        chainId: parseInt(formData.chainId), // Ensure chainId is sent as a number
        slippage: parseFloat(formData.slippage) // Ensure slippage is sent as a number
      });
      setQuote(response.data);
    } catch (error) {
      console.error('Error fetching quote:', error);
      handleError('Error fetching quote: ' + error.message);
    }
  };

  const handleApproval = async () => {
    if (!provider || !quote) return;
    const signer = provider.getSigner();
    const erc20Contract = new ethers.Contract(formData.tokenIn, ['function approve(address spender, uint256 amount) public returns (bool)'], signer);
    try {
      const tx = await erc20Contract.approve(quote.approvalAddress, ethers.utils.parseUnits(formData.amount.toString(), 18));
      const receipt = await tx.wait();
      setApprovalReceipt(receipt);
      console.log('Approval successful');
    } catch (error) {
      console.error('Error during approval:', error);
    }
  };

  const handleTransaction = async () => {
    console.log({ provider, quote })
    if (!provider || !quote) return;
    const signer = provider.getSigner();
    try {
      const tx = await signer.sendTransaction({
        to: quote.to,
        data: quote.data,
        value: ethers.BigNumber.from(quote.value)
      });
      const receipt = await tx.wait();
      setTransactionReceipt(receipt);
      console.log('Transaction successful');
    } catch (error) {
      console.error('Error during transaction:', error);
    }
  };

  return (
    <div className="App">
      <h1>Best Quote Finder</h1>
      {account ? (
        <p>Connected: {account}</p>
      ) : (
        <button onClick={connectWallet}>Connect to MetaMask</button>
      )}
      <form onSubmit={handleSubmit}>
        <input name="chainId" value={formData.chainId} onChange={handleChange} placeholder="Chain ID" />
        <input name="slippage" value={formData.slippage} onChange={handleChange} placeholder="Slippage" />
        <input name="amount" value={formData.amount} onChange={handleChange} placeholder="Amount" />
        <input name="tokenIn" value={formData.tokenIn} onChange={handleChange} placeholder="Token In" />
        <input name="tokenOut" value={formData.tokenOut} onChange={handleChange} placeholder="Token Out" />
        <input name="sender" value={formData.sender} onChange={handleChange} placeholder="Sender" readOnly />
        <input name="receiver" value={formData.receiver} onChange={handleChange} placeholder="Receiver" />
        <button type="submit">Get Best Quote</button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {quote && (
        <div>
          <h2>Best Quote:</h2>
          <pre>{JSON.stringify(quote, null, 2)}</pre>
          <button onClick={handleApproval}>Approve</button>
          <button onClick={handleTransaction}>Execute Transaction</button>
        </div>
      )}
      {approvalReceipt && (
        <div>
          <h3>Approval Receipt:</h3>
          <pre>{JSON.stringify(approvalReceipt, null, 2)}</pre>
        </div>
      )}

      {transactionReceipt && (
        <div>
          <h3>Transaction Receipt:</h3>
          <pre>{JSON.stringify(transactionReceipt, null, 2)}</pre>
        </div>
      )}

    </div>
  );
}

export default App;