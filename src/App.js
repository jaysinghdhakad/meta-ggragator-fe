import React, { useState } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';

const App = () => {
  const [amount, setAmount] = useState(0);
  const [tokenIn, setTokenIn] = useState('');
  const [tokenOut, setTokenOut] = useState('');
  const [sender, setSender] = useState('');
  const [receiver, setReceiver] = useState('');
  const [chainId, setChainId] = useState(0);
  const [slippage, setSlippage] = useState('');
  const [protocol, setProtocol] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [approvalAddress, setApprovalAddress] = useState('');
  const [swapData, setSwapData] = useState(null);
  const [transactionHash, setTransactionHash] = useState('');
  const [bestAmountOutResponse, setBestAmountOutResponse] = useState(null);
  const [approvalResponse, setApprovalResponse] = useState(null);
  const [swapDataResponse, setSwapDataResponse] = useState(null);
  const [transactionResponse, setTransactionResponse] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider] = useState(null);
  const [error, setError] = useState('');

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        setWalletAddress(address);
        setProvider(provider);
        setError('');
      } else {
        setError("Please install MetaMask!");
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError('Error connecting wallet: ' + error.message);
    }
  };

  const clearData = () => {
    setBestAmountOutResponse(null);
    setTransactionResponse(null);
    setTransactionHash('');
    setError('');
    setSwapDataResponse(null);
    setApprovalResponse(null);
    setSwapData(null);
  };

  const handleGetBestAmountOut = async () => {
    try {
      clearData();
      const response = await axios.post('http://bsccentral.velvetdao.xyz:3000/best-amount-out', {
        amount:Number(amount),
        tokenIn:tokenIn,
        tokenOut:tokenOut,
        sender:sender,
        receiver:receiver,
        chainId:Number(chainId)
      });

      console.log(response.setSwapDataResponse)

      setBestAmountOutResponse(response.data);
      setAmountOut(response.data.amountOut);
      setApprovalAddress(response.data.approvalAddress);
      setError('');
    } catch (error) {
      console.log(error)
      console.error('Error getting best amount out:', error);
      setError('Error getting best amount out: ' + error.message);
    }
  };

  const getTokenDecimals = async (tokenAddress) => {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, [
        'function decimals() view returns (uint8)'
      ], provider);
      const decimals = await tokenContract.decimals();
      return decimals;
    } catch (error) {
      console.error('Error fetching token decimals:', error);
      setError('Error fetching token decimals: ' + error.message);
      return null;
    }
  };

  const handleApprove = async () => {
    try {
      if (!provider) {
        setError("Please connect your wallet first!");
        return;
      }
      const signer = provider.getSigner();
      const decimals = await getTokenDecimals(tokenIn);
      if (decimals === null) {
        return;
      }
      const tokenContract = new ethers.Contract(tokenIn, [
        'function approve(address spender, uint256 amount) public returns (bool)'
      ], signer);
  
      const approvalTx = await tokenContract.approve(approvalAddress, ethers.utils.parseUnits(amount, decimals));
      const receipt = await approvalTx.wait();
      setApprovalResponse(receipt);
      setError('');
    } catch (error) {
      console.error('Error approving token transfer:', error);
      setError('Error approving token transfer: ' + error.message);
    }
  };

  const handleGetSwapData = async () => {
    try {
      const response = await axios.post('http://bsccentral.velvetdao.xyz:3000/swap-data', {
        slippage:Number(slippage),
        amount:Number(amount),
        tokenIn:tokenIn,
        tokenOut:tokenOut,
        sender:sender,
        amountOut:Number(amountOut),
        protocol:protocol,
        receiver:receiver,
        chainId:Number(chainId)
      });

      setSwapDataResponse(response.data);
      setSwapData(response.data);
      setError('');
    } catch (error) {
      console.error('Error getting swap data:', error);
      setError('Error getting swap data: ' + error.message);
    }
  };

  const handleExecuteTransaction = async () => {
    try {
      if (!provider) {
        setError("Please connect your wallet first!");
        return;
      }
      const signer = provider.getSigner();

      const tx = {
        to: swapData.to,
        data: swapData.data,
        value: ethers.utils.parseUnits(swapData.value, 'wei')
      };

      const transactionResponse = await signer.sendTransaction(tx);
      const receipt = await transactionResponse.wait();

      setTransactionResponse(receipt);
      setTransactionHash(transactionResponse.hash);
      setError('');
    } catch (error) {
      console.error('Error executing transaction:', error);
      setError('Error executing transaction: ' + error.message);
    }
  };

  return (
    <div>
      <h1>Swap Tokens</h1>
      <button onClick={connectWallet}>Connect Wallet</button>
      {walletAddress && <p>Connected Wallet: {walletAddress}</p>}
      <input type="text" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <input type="text" placeholder="Token In" value={tokenIn} onChange={(e) => setTokenIn(e.target.value)} />
      <input type="text" placeholder="Token Out" value={tokenOut} onChange={(e) => setTokenOut(e.target.value)} />
      <input type="text" placeholder="Sender" value={sender} onChange={(e) => setSender(e.target.value)} />
      <input type="text" placeholder="Receiver" value={receiver} onChange={(e) => setReceiver(e.target.value)} />
      <input type="text" placeholder="Chain ID" value={chainId} onChange={(e) => setChainId(e.target.value)} />
      <input type="text" placeholder="Slippage" value={slippage} onChange={(e) => setSlippage(e.target.value)} />
      <input type="text" placeholder="Protocol" value={protocol} onChange={(e) => setProtocol(e.target.value)} />
      <button onClick={handleGetBestAmountOut}>Get Best Amount Out</button>
      <button onClick={handleApprove}>Approve</button>
      <button onClick={handleGetSwapData}>Get Swap Data</button>
      <button onClick={handleExecuteTransaction}>Execute Transaction</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {bestAmountOutResponse && <pre>Best Amount Out Response: {JSON.stringify(bestAmountOutResponse, null, 2)}</pre>}
      {approvalResponse && <pre>Approval Response: {JSON.stringify(approvalResponse, null, 2)}</pre>}
      {swapDataResponse && <pre>Swap Data Response: {JSON.stringify(swapDataResponse, null, 2)}</pre>}
      {transactionResponse && <pre>Transaction Response: {JSON.stringify(transactionResponse, null, 2)}</pre>}
      {transactionHash && <p>Transaction Hash: {transactionHash}</p>}
    </div>
  );
};

export default App;