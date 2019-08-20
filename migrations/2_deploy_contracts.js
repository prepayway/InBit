const InBitToken = artifacts.require("./InBitToken.sol");

module.exports = function(deployer) {
  deployer.deploy(InBitToken, 1276363635, 18);//1276363635000000000000000000 for live
};
