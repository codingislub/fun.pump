"use client"

import { useEffect, useState } from "react"
import { ethers } from 'ethers'

// Components
import Header from "./components/Header"
import List from "./components/List"
import Token from "./components/Token"
import Trade from "./components/Trade"

// ABIs & Config
import Factory from "./abis/Factory.json"
import config from "./config.json"
import images from "./images.json"

export default function Home() {
  const [provider, setProvider] = useState(null)
  const [account, setAccount] = useState(null)
  const [factory, setFactory] = useState(null)
  const [fee, setFee] = useState(0)
  const [tokens, setTokens] = useState([])
  const [token, setToken] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showTrade, setShowTrade] = useState(false)

  function toggleCreate() {
    showCreate ? setShowCreate(false) : setShowCreate(true)
  }

  function toggleTrade(token) {
    setToken(token)
    showTrade ? setShowTrade(false) : setShowTrade(true)
  }

async function loadBlockchainData() {
  try {
    console.log("=== Starting loadBlockchainData ===")
    
    // Use MetaMask for our connection
    const provider = new ethers.BrowserProvider(window.ethereum)
    setProvider(provider)
    
    // Get the current network
    const network = await provider.getNetwork()
    console.log("Network chainId:", network.chainId.toString())

    const factoryAddress = config[network.chainId]?.factory?.address
    console.log("Factory address:", factoryAddress)
    
    if (!factoryAddress) {
      console.error("No factory address found!")
      return
    }

    const code = await provider.getCode(factoryAddress)
    console.log("Contract code length:", code.length)
    console.log("Has contract code:", code !== "0x")
    
    if (code === "0x") {
      console.error("No contract found at this address!")
      return
    }

    // Create reference to Factory contract
    const factory = new ethers.Contract(factoryAddress, Factory, provider)
    setFactory(factory)
    console.log("Factory contract created")

    // Test provider connection
    console.log("=== Testing provider connection ===")
    console.log("Provider network:", await provider.getNetwork())
    
    // Test raw call to fee() function
    console.log("Testing raw call to fee()...")
    try {
      const rawResult = await provider.call({
        to: factoryAddress,
        data: "0xddca3f43" // Function selector for fee()
      })
      console.log("Raw result:", rawResult)
    } catch (rawError) {
      console.error("Raw call failed:", rawError)
    }

    // Fetch the fee
    try {
      console.log("Attempting to call factory.fee()...")
      const fee = await factory.fee()
      console.log("Fee retrieved:", fee.toString())
      setFee(fee)
    } catch (error) {
      console.error("Error calling fee():", error)
      return
    }

    // Prepare to fetch token details
    const totalTokens = await factory.totalTokens()
    console.log("Total tokens:", totalTokens.toString())
    const tokens = []

    // We'll get the first 6 tokens listed
    for (let i = 0; i < totalTokens; i++) {
      if (i == 6) {
        break
      }

      const tokenSale = await factory.getTokenSale(i)

      // We create our own object to store extra fields
      // like images
      const token = {
        token: tokenSale.token,
        name: tokenSale.name,
        creator: tokenSale.creator,
        sold: tokenSale.sold,
        raised: tokenSale.raised,
        isOpen: tokenSale.isOpen,
        image: images[i]
      }

      tokens.push(token)
    }

    // We reverse the array so we can get the most
    // recent token listed to display first
    setTokens(tokens.reverse())
    console.log("Successfully loaded", tokens.length, "tokens")
    
  } catch (error) {
    console.error("Error in loadBlockchainData:", error)
  }
}

  useEffect(() => {
    loadBlockchainData()
  }, [showCreate, showTrade])

  return (
    <div className="page">
      <Header account={account} setAccount={setAccount} />

      <main>
        <div className="create">
          <button onClick={factory && account && toggleCreate} className="btn--fancy">
            {!factory ? (
              "[ contract not deployed ]"
            ) : !account ? (
              "[ please connect ]"
            ) : (
              "[ start a new token ]"
            )}
          </button>
        </div>

        <div className="listings">
          <h1>new listings</h1>

          <div className="tokens">
            {!account ? (
              <p>please connect wallet</p>
            ) : tokens.length === 0 ? (
              <p>No tokens listed</p>
            ) : (
              tokens.map((token, index) => (
                <Token
                  toggleTrade={toggleTrade}
                  token={token}
                  key={index}
                />
              ))
            )}
          </div>
        </div>

        {showCreate && (
          <List toggleCreate={toggleCreate} fee={fee} provider={provider} factory={factory} />
        )}

        {showTrade && (
          <Trade toggleTrade={toggleTrade} token={token} provider={provider} factory={factory} />
        )}
      </main>
    </div>
  );
}