import React from "react";
import { render } from "react-dom";

import Web3 from "web3";
import sigUtil from "eth-sig-util";
import withHyperMask from "hypermask";

import ERC20_ABI from "./ERC20_ABI";
import './style.css'


let query = {}
decodeURIComponent(location.search.slice(1)).split('&').forEach(part => {
    query[part.split('=')[0]] = part.split('=')[1]
});



const TARGET_ADDR = "0x4c020de581b98292f1cce93698a1fec462b0c4d2";
const HMTT_ADDR = "0x8790b46fd9fe602a5a7ee8957cc9f558e58a31b5";
const NETWORKS = {
  mainnet: "Main Ethereum Network",
  main: "Main Ethereum Network",
  ropsten: "Ropsten Test Network",
  kovan: "Kovan Test Network",
  morden: "Morden Test Network",
  rinkeby: "Rinkeby Test Network",
  private: "Unknown Network"
};

class App extends React.Component {
  constructor(props) {
    super(props);

    const infuraURL = query.chain == 'mainnet' ? "wss://mainnet.infura.io/ws" : "wss://ropsten.infura.io/ws";
    let infuraProvider = new Web3.providers.WebsocketProvider(infuraURL);

    // Uncomment this to only use HyperMask if no Web3 provider is detected
    // MetaMask, Mist, etc. trump HyperMask
    if (typeof window.web3 === "undefined" || query.chain) {
      console.log("No Web3 provider found. Using HyperMask.");
      // second parameter is optional, defaults to app.hypermask.io. Pass in a localhost URL when developing.
      const hypermaskURL = ('local' in query) ? 'http://localhost:41139/' : "https://app.hypermask.io/"
      window.web3 = new Web3(withHyperMask(infuraProvider, hypermaskURL));
    } else if (typeof web3 !== "undefined") {
      alert(
        "Existing Web3 provider detected (probably MetaMask). HyperMask will not be used for this demo. Run this demo in an incognito window to see HyperMask in action."
      );
      window.web3 = new Web3(web3.currentProvider);
    }

    this.state = {
      network: null,
      gasPrice: null,
      account: null,
      showAccount: false
    };
  }

  componentDidMount() {
    // determine current network
    web3.eth.net.getNetworkType().then(result => {
      let network = NETWORKS[result] || "Unknown Network";
      console.log(JSON.stringify(network, null, 2));
      this.setState({ network: network });
    });

    // fetch EVM gas price
    web3.eth.getGasPrice().then(result => {
      let gasPrice = web3.utils.fromWei(result, "Gwei");
      this.setState({ gasPrice: gasPrice });
    });

    this.getAddress();

    let hmttContract = new web3.eth.Contract(ERC20_ABI, HMTT_ADDR, {});
    this.setState({ erc20Contract: hmttContract });
  }

  async getAddress() {
    let accounts = await web3.eth.getAccounts();
    let account = accounts[0]
      ? {
          address: accounts[0],
          balance: web3.utils.fromWei(await web3.eth.getBalance(accounts[0]))
        }
      : "no account found";
    console.log(JSON.stringify(account, null, 2));
    this.setState({ account: account });
  }

  signMsg(msgParams, from) {
    web3.currentProvider.sendAsync(
      {
        method: "eth_signTypedData",
        params: [msgParams, from],
        from: from
      },
      function(err, result) {
        if (err) return console.error(err);
        if (result.error) {
          return console.error(result.error.message);
        }

        const recovered = sigUtil.recoverTypedSignature({
          data: msgParams,
          sig: result.result
        });
        if (recovered.toLowerCase() === from.toLowerCase()) {
          console.log("Recovered signer: ", recovered, from);
        } else {
          console.log("Failed to verify signer, got: ", recovered, from);
        }
      }
    );
  }

  render() {
    return (
      <div>
        <h1 style={{ margin: "0px" }}>HyperMask Demo</h1>
        <p>
          This is a simple demo app for HyperMask. View source on GitHub{" "}
          <a href="https://github.com/hypermask/hypermask-examples">here</a>.
        </p>
        <p>
          HyperMask creates a new wallet for you under the hood. To get your
          address, view your balance, or download your private key, go to{" "}
          <a href="https://app.hypermask.io" target="_blank">
            app.hypermask.io
          </a>.
        </p>
        <br />
        <div>
          Current Gas Price:{" "}
          <span id="gasPrice">{this.state.gasPrice || "Loading..."}</span>
        </div>
        <div>
          Network:{" "}
          <span id="network">{this.state.network || "Loading..."}</span>
        </div>

        <br />
        <small>Basic functionality</small>
        <br />
        <button
          id="listAccounts"
          onClick={async () => {
            this.setState({ showAccount: true });
          }}
        >
          Get Account Details
        </button>
        <button
          id="sendEth"
          onClick={async () => {
            let accounts = await web3.eth.getAccounts();
            web3.eth
              .sendTransaction({
                from: this.state.account.address,
                to: TARGET_ADDR,
                value: web3.utils.toWei("0.002", "ether")
              })
              .on("transactionHash", e => console.log("tx hash", e))
              .on("receipt", e => console.log("receipt", e))
              .on("confirmation", e => console.log("confirmation", e))
              .on("error", e => console.error("error", e));
          }}
        >
          Send ETH
        </button>
        <button
          id="personalSign"
          onClick={async () => {
            var data = web3.utils.toHex(
              "We the People of the United States, in Order to form a more perfect Union, establish Justice, insure domestic Tranquility, provide for the common defense, promote the general Welfare, and secure the Blessings of Liberty to ourselves and our Posterity, do ordain and establish this Constitution for the United States of America."
            );
            web3.currentProvider.sendAsync(
              {
                id: 1,
                method: "personal_sign",
                params: [data, await web3.eth.getCoinbase()]
              },
              function(err, result) {
                console.log(err, result);
              }
            );
          }}
        >
          Sign Message
        </button>
        <button
          id="signTyped"
          onClick={async () => {
            const typedData = [
              {
                type: "string",
                name: "message",
                value: "Hi, Alice!"
              },
              {
                type: "uint",
                name: "value",
                value: 42
              }
            ];
            // const signature = await web3.eth.signTypedData(typedData);
            let currAccount = await web3.eth.getCoinbase();
            console.log("Signing typed data");
            console.log(JSON.stringify(typedData, null, 2));
            console.log(JSON.stringify(currAccount, null, 2));
            this.signMsg(typedData, currAccount);
          }}
        >
          Sign Typed Data
        </button>
        <pre style={{ fontFamily: "monospace" }}>
          {this.state.showAccount &&
            JSON.stringify(this.state.account, null, 2)}
        </pre>
        <br />
        <small>ERC20 demos</small>
        <br />
        <button
          id="buyToken"
          onClick={async () => {
            let accounts = await web3.eth.getAccounts();
            console.log(JSON.stringify(accounts, null, 2));
            web3.eth
              .sendTransaction({
                from: accounts[0],
                to: HMTT_ADDR,
                value: web3.utils.toWei("0.03", "ether")
              })
              .on("transactionHash", e => console.log("tx hash", e))
              .on("receipt", e => console.log("receipt", e))
              .on("confirmation", e => console.log("confirmation", e))
              .on("error", e => console.error("error", e));
          }}
        >
          Buy ERC20 Token
        </button>
        <button
          id="sendToken"
          onClick={async () => {
            let accounts = await web3.eth.getAccounts();
            let HMTTContract = this.state.erc20Contract;
            // send 3 HMTT tokens to TARGET_ADDR
            let gasInfo = await fetch(
              "https://ethgasstation.info/json/ethgasAPI.json"
            );
            let gasInfoJson = await gasInfo.json();
            HMTTContract.methods
              .transfer(TARGET_ADDR, web3.utils.toWei("3"))
              .send({
                from: accounts[0],
                gasPrice: web3.utils.toWei(
                  gasInfoJson.safeLow.toString(),
                  "gwei"
                )
              })
              .on("transactionHash", e => console.log("tx hash", e))
              .on("receipt", e => console.log("receipt", e))
              .on("confirmation", e => console.log("confirmation", e))
              .on("error", e => console.error("error", e));
          }}
        >
          Send ERC20 Token
        </button>
      </div>
    );
  }
}

render(<App />, document.getElementById("root"));
