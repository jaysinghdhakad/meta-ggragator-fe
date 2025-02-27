import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { TurnkeyProvider } from "@turnkey/sdk-react";

const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_BASE_URL,
  defaultOrganizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID,
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY,
  serverSignUrl: process.env.NEXT_PUBLIC_SERVER_SIGN_URL,
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <TurnkeyProvider config={config}>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </TurnkeyProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
