# InBit Token

The smart contract for [PrepayWay](https://prepayway.com/) InBit token

![InBit](InBit.png)

### Token Standard ###

InBit is an ERC-20 token

### Contract address ###

Contract address on [Ropsten](https://ropsten.etherscan.io/) Test Network is: 0x7980ef41fEab11459b60CF5b3dfb267d5400672d


### Contribution guidelines ###

The InBit Token follows the [ERC-20](https://en.wikipedia.org/wiki/ERC-20) standard

It has features for locking described in  [Ethereum Improvement Proposal 1130](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1132.md)

InBit token has a burning possibility. Burning of token reduces total supply.

Contracts are written in [Solidity](https://solidity.readthedocs.io/en/develop/) and were tested using [Truffle](http://truffleframework.com/) and [ganache](https://github.com/trufflesuite/ganache-cli).

We use [Open Zeppelin](https://github.com/OpenZeppelin/openzeppelin-solidity) code for `SafeMath` logic which is included in the contracts.
