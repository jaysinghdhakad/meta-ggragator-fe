"use client";
import React, { useState,useEffect } from 'react';
import { useTurnkey } from "@turnkey/sdk-react";
import {
  GoogleOAuthProvider,
  GoogleLogin,
  useGoogleLogin,
} from "@react-oauth/google";
import { bytesToHex } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha2'
import { jwtDecode } from "jwt-decode";
import { useForm } from "react-hook-form";
import { generateP256KeyPair } from "@turnkey/crypto";
import { DEFAULT_ETHEREUM_ACCOUNTS } from "@turnkey/sdk-browser";





import dotenv from 'dotenv';
dotenv.config();




const App = () => {

  useEffect(() => {
    // Check if the WebApp is available
    if (window.Telegram && window.Telegram.WebApp) {
      const userData = window.Telegram.WebApp.initDataUnsafe;

      // Access user data
      const userId = userData.user.id; // User ID
      const userFirstName = userData.user.first_name; // User's first name
      const userLastName = userData.user.last_name; // User's last name
      const userUsername = userData.user.username; // User's username
      const userPhotoUrl = userData.user.photo_url; // User's profile photo URL

      console.log('User Data:', {
        userId,
        userFirstName,
        userLastName,
        userUsername,
        userPhotoUrl,
      });
    }
  }, []);

  console.log(process.env.REACT_APP_GOOGLE_OAUTH_CLIENT_ID);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { turnkey, passkeyClient, authIframeClient } = useTurnkey();
  console.log({ turnkey, passkeyClient, authIframeClient });
  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    try {
      // Handle successful login (e.g., redirect or show a success message)
    } catch (error) {
      setError(error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      // Handle successful login (e.g., redirect or show a success message)
    } catch (error) {
      setError(error.message);
    }
  };

  const handleGoogleLogin = async (response) => {
    console.log("handleGoogleLogin", response);
    // 'credential' is the ID token returned from Google
    const token = response.credential;

    // Decode the token using jwt-decode
    try {
      const decoded = jwtDecode(token);
      console.log("Decoded Token: ", decoded);

      // Access the email directly
      const userEmail = decoded.email;
      console.log("User's Email: ", userEmail);

      const keyPair = generateP256KeyPair();
      const privateKey = keyPair.privateKey;
      const publicKey = keyPair.publicKey;
      console.log(keyPair)

      const subOrg = await turnkey.serverSign("createSubOrganization", [
        {
          organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID,
          subOrganizationName: userEmail,
          rootUsers: [
            {
              userName: userEmail,
              userEmail: userEmail,
              apiKeys: [
              ],
              oauthProviders: [
                {
                  providerName: "Google Auth - Embedded Wallet",
                  oidcToken: response.credential,
                },
              ],
              authenticators: [],
            }
          ],
          rootQuorumThreshold: 1,
          wallet: {
            walletName: "Default Wallet",
            accounts: DEFAULT_ETHEREUM_ACCOUNTS, // Add your accounts here
          }
        },
      ], "http://localhost:5000/api/create-sub-organization");


      const delegateUserConfig = [
        {
          userName: `delegate user - ${userEmail}`,
          apiKeys: [
            {
              apiKeyName: `Wallet Auth - ${publicKey}`,
              publicKey: publicKey,
              curveType: "API_KEY_CURVE_SECP256K1", // Adjust based on your wallet type
            },
          ],
          authenticators: [],
          userTags: []
        }
      ]

      const delegateUserResponse = await turnkey.serverSign("addUserToSubOrganization", [subOrg.subOrganizationId, delegateUserConfig], "http://localhost:5000/api/create-user");


      console.log(subOrg)
    } catch (err) {
      console.log(err)
    }
  }


  return (
    <div className="auth-container">
      <h1>Authentication</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleEmailSignIn}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Sign In with Email</button>
      </form>
      <button onClick={handleGoogleSignIn}>Sign In with Google</button>

      {authIframeClient?.iframePublicKey ?
        <GoogleOAuthProvider
          clientId="457197742728-o6gcr5ooleqpumlhio9702dsrufs34sc.apps.googleusercontent.com"
        >
          <GoogleLogin nonce={bytesToHex(sha256(authIframeClient.iframePublicKey))} onSuccess={handleGoogleLogin} useOneTap />
        </GoogleOAuthProvider> : null
      }

    </div>
  );
};

export default App;