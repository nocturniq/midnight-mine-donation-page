# midnight-mine-donation-page
A standalone tool to delegate your Midnight Mine rewards to another address.
<img width="2541" height="1419" alt="image" src="https://github.com/user-attachments/assets/972defbd-9c91-406d-bc4b-fa9f8b5371c9" />

# Deploy
To start this tool, you will need to do
```bash
yarn install
```
And then you can deploy the frontend and the submit API via
```bash
yarn dev
```
Note that we have that this does two things
```json
  "scripts": {
    "start": "craco start",
    "build": "craco build",
    "proxy": "node proxy/server.mjs",
    "dev": "concurrently \"yarn proxy\" \"yarn start\""
  },
```

# How to use
1. This tool supports most wallets (if not, feel free to contribute with a PR). 

2. After connecting your wallet, you can see your used and unused addresses (the Midnight Mine commonly used the unused wallet address). 

3. Below that you can paste in two registered addresses (note that both `from` and the `to` address need to be registered!!). The `from` field is automatically filled with either the used or unused wallet address (see the source button), but you can also override this value if needed.

4. Press the donate button, and a signature prompt of your wallet will pop up. Note that if the `from` field does _not_ contain an address that the connected wallet owns, it will fail. Also, double-check that you donate your rewards to the correct address!

5. After signing, the donate payload will be shown. You can submit this via either a curl command (see the `copy curl` button) or send it now via the `send now` button that will use the submit API (this is running on port 4000).

6. Read the response message.

TIP: Note that you can undo a donation by using the same `from` and `to` address. Also, try refreshing the page if previously signed data is shown that you want cleared.
