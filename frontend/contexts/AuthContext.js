import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [role, setRole] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');

  // Auto-connect if already connected
  useEffect(() => {
    checkConnection();
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      logout();
    } else if (accounts[0] !== account) {
      // Re-authenticate for new account
      logout();
    }
  };

  const checkConnection = async () => {
    const savedAccount = localStorage.getItem('blockguard_account');
    const savedRole = localStorage.getItem('blockguard_role');
    
    if (savedAccount && savedRole) {
      setAccount(savedAccount);
      setRole(savedRole);
    }
  };

  const determineRole = (address) => {
    // For demo purposes, deterministically assign roles based on the last character of the address
    // In a real system, this would query the smart contract's AccessControl or a secure backend
    const lastChar = address.slice(-1).toLowerCase();
    
    if (['0', '1', '2', '3'].includes(lastChar)) {
      return 'Registrar';
    } else if (['4', '5', '6', '7'].includes(lastChar)) {
      return 'Government Official';
    } else {
      return 'Landowner';
    }
  };

  const login = async () => {
    if (!window.ethereum) {
      setAuthError('MetaMask is not installed! Please install it to use this app.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError('');

    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const currentAccount = accounts[0];

      // Sign message to prove ownership (ECDSA on secp256k1)
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      const message = `Welcome to Blockguard Land Registry System!

Please sign this message to verify your identity and connect your wallet. This action does not cost any gas fees.

Wallet Address:
${currentAccount}

Timestamp: ${new Date().toISOString()}`;

      // This prompts the MetaMask signature popup
      const signature = await signer.signMessage(message);
      
      // Verify signature internally (Optional since we know the signer just signed it, 
      // but good practice to show how the backend would verify it)
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() === currentAccount.toLowerCase()) {
        const assignedRole = determineRole(currentAccount);
        
        setAccount(currentAccount);
        setRole(assignedRole);
        
        localStorage.setItem('blockguard_account', currentAccount);
        localStorage.setItem('blockguard_role', assignedRole);
      } else {
        throw new Error("Signature verification failed");
      }
    } catch (error) {
      console.error(error);
      setAuthError(error.message || 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = () => {
    setAccount(null);
    setRole(null);
    localStorage.removeItem('blockguard_account');
    localStorage.removeItem('blockguard_role');
  };

  return (
    <AuthContext.Provider value={{ account, role, isAuthenticating, authError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
