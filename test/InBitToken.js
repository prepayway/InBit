const InBitToken = artifacts.require("./InBitToken.sol");

contract('InBitToken', function(accounts){

  var tokenInstance;

  const lockTimestamp = () => {
    return new Promise((resolve, reject) => {
      web3.eth.getBlockNumber(function(error, result){
        if (!error)
        blockNumber= result;
      });
      web3.eth.getBlock(blockNumber, function(error, result){
        if(!error)
          return result.timestamp
        else
          throw new Error(error);
      })
    })
  };

  const advanceTime = (time) => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [time],
        id: new Date().getTime()
      }, (err, result) => {
        if (err) {
          return reject(err)
        }
        return resolve(result)
      })
    })
  }

  const advanceBlock = () => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: new Date().getTime()
      }, (err, result) => {
        if (err) {
          return reject(err)
        }
        const newBlockHash = web3.eth.getBlock('latest').hash
        return resolve(newBlockHash)
      })
    })
  }

  const advanceTimeAndBlock = async (time) => {
    await advanceTime(time)
    await advanceBlock()
    return Promise.resolve(web3.eth.getBlock('latest'))
  }

  const findCurrentBlockTimestamp = async () => {
    await web3.eth.getBlockNumber(function(error, result){
      if (!error)
      blockNumber = result;
    });
    let blockTimestamp = await web3.eth.getBlock(blockNumber, function(error, result){
      if(!error)
        currentBlockTimestamp =   result.timestamp;
      else
        throw new Error(error);
    })
  }

  before(async () => {
    tokenInstance = await InBitToken.deployed();
  });

  it('intializes the contract with the correct values and alllocates the initial supply upopn deployment', async function(){
    let name = await tokenInstance.name();
    assert.equal(name, 'InBit Token','has the correct name');
    let symbol = await tokenInstance.symbol();
    assert.equal(symbol, 'InBit', 'has the correct symbol')
    let standard = await tokenInstance.standard();
    assert.equal(standard, 'InBit Token v1.0', 'has a correct standard');
    let decimals = await tokenInstance.decimals();
    assert.equal(decimals, 18, 'has the correct number of decimals');
    let totalSupply = await tokenInstance.totalSupply();
    assert.equal(totalSupply.toNumber(), 1276363635, 'sets total supply to 12763636364');
    let adminBalance = await tokenInstance.balanceOf(accounts[0]);
    assert.equal(adminBalance.toNumber(),1276363635, 'it alllocates the intital supply to the admin account');
  });

  it('transfers token ownership (transfer)', async function(){
    fromAccount = accounts[0];
    toAccount = accounts[1];
    //trying to call a trasfer form the account with 0 balance
    try {
      await tokenInstance.transfer.call(accounts[1],999999999999);
    } catch (error001) {
      assert(error001.message.indexOf('revert')>= 0, 'error message must contain revert');
    }
    let success = await tokenInstance.transfer.call(toAccount, 0, {from: fromAccount});
    assert.equal(success, true, 'it returnes true');
    const {logs} = await  tokenInstance.transfer(toAccount, 6364, {from: fromAccount});
    assert.equal(logs.length, 1, 'triggers one event');
    assert.equal(logs[0].event, 'Transfer', 'should be the Transfer event');
    assert.equal(logs[0].args._from, fromAccount, 'logs the account tokens are tansferred from');
    assert.equal(logs[0].args._to, toAccount, 'logs the account tokens are tansferred to');
    assert.equal(logs[0].args._value, 6364, 'logs the transfer amount');
    let balanceTo = await tokenInstance.balanceOf(toAccount);
    assert.equal(balanceTo.toNumber(),6364, 'adds the amount to the recieving account');
    let balanceFrom = await tokenInstance.balanceOf(fromAccount);
    assert.equal(balanceFrom.toNumber(), 1276357271, 'deducts the amount fomr the sender account');
  });

  it('approves tokens for delegated transfer (approve)', async function() {
    let success = await tokenInstance.approve.call(accounts[1],100);
    assert.equal(success, true, 'it returns true');
    const {logs} = await  tokenInstance.approve(accounts[1], 100, {from: accounts[0]});
    assert.equal(logs.length, 1, 'triggers one event');
    assert.equal(logs[0].event, 'Approval', 'should be the Approval event');
    assert.equal(logs[0].args._owner, accounts[0], 'logs the account tokens are authrized by');
    assert.equal(logs[0].args._spender, accounts[1], 'logs the account tokens are authorized to');
    assert.equal(logs[0].args._value, 100, 'logs the transfer amount');
    let allowance = await tokenInstance.allowance(accounts[0], accounts[1]);
    assert.equal(allowance.toNumber(),100, 'stores the allowance for delegated transfer');
  });

  it('handles delegaged token transfers (transferFrom)', async function() {
    adminAccount = accounts[0];
    fromAccount = accounts[2];
    toAccount = accounts[3];
    spendingAccount = accounts[4];
    // transfer tokens to fromAccount
    await  tokenInstance.transfer(fromAccount, 100, {from: adminAccount});
    await  tokenInstance.approve(spendingAccount, 10, { from: fromAccount});
    //trying to transfer more than the balance
    try {
      await tokenInstance.transferFrom(fromAccount, toAccount, 999999999999, { from: spendingAccount});
    } catch (error002) {
      assert(error002.message.indexOf('revert')>= 0, 'cannottransfer lager than the  balance');
    }
    //trying to transfer more than allowance
    try {
      await tokenInstance.transferFrom(fromAccount, toAccount, 20, { from: spendingAccount});
    } catch (error003) {
      assert(error003.message.indexOf('revert')>= 0, 'cannot transfer lager than the  allowance');
    }
    let success = await tokenInstance.transferFrom.call(fromAccount, toAccount, 10, { from: spendingAccount});
    assert.equal(success, true);
    const {logs} = await tokenInstance.transferFrom(fromAccount, toAccount, 10, { from: spendingAccount});
    assert.equal(logs.length, 1, 'triggers one event');
    assert.equal(logs[0].event, 'Transfer', 'should be the Transfer event');
    assert.equal(logs[0].args._from, fromAccount, 'logs the account tokens are trasferred from');
    assert.equal(logs[0].args._to, toAccount, 'logs the account tokens are transferred to');
    assert.equal(logs[0].args._value, 10, 'logs the transfer amount');
    let balanceFrom = await tokenInstance.balanceOf(fromAccount);
    assert.equal(balanceFrom.toNumber(), 90, 'deducts the ammount from the sending account');
    let balanceTo = await tokenInstance.balanceOf(toAccount);
    assert.equal(balanceTo.toNumber(),10, 'adds to the amount to the recieving account');
    let allowance = await tokenInstance.allowance(fromAccount, spendingAccount);
    assert.equal(allowance.toNumber(), 0, 'deducts the ammount from the allowance');
  });

  it('handles the burn of the tokens (burn)', async function() {
    burnAccount = accounts[5];
    await tokenInstance.transfer(burnAccount, 100, {from: accounts[0]});
    let balance = await tokenInstance.balanceOf(burnAccount);
    assert.equal(balance.toNumber(), 100, 'has transfered 100 to burning account');
    //try burning more than there is on the account
    try {
      await tokenInstance.burn(1000, {from: burnAccount});
    } catch (error004) {
      assert(error004.message.indexOf('revert')>= 0, 'canot burn amount lager than the  balance');
    }
    //try burging a negative ammount
    try {
      await tokenInstance.burn(-1, {from: burnAccount})
    } catch (error005) {
      assert(error005.message.indexOf('revert')>= 0, 'canot burn a negative amount');
    }
    let success = await tokenInstance.burn.call(10, {from: burnAccount})
    assert.equal(success, true);
    const {logs} = await tokenInstance.burn(10, {from: burnAccount});
    assert.equal(logs.length, 1, 'triggers one event');
    assert.equal(logs[0].event, 'Burn', 'should be the Burn event');
    assert.equal(logs[0].args._from, burnAccount, 'logs the account tokens are burned from');
    assert.equal(logs[0].args._value, 10, 'logs the burn amount');
    let balanceBurn= await tokenInstance.balanceOf(burnAccount);
    assert.equal(balanceBurn.toNumber(), 90, 'deducts amount from burning account ');
    let totalSupply = await tokenInstance.totalSupply();
    assert.equal(totalSupply.toNumber(), 1276363625, 'deducts amount from totalSupply');
    });

  it('handles the lock of the tokens for a specific address (lock)', async function(){
    fromAccount = accounts[2];
    lockReason = web3.utils.asciiToHex('test'); //toUtf8()
    lockReason2 = web3.utils.asciiToHex('test2');
    contractAdderss = tokenInstance.address;
    date = new Date();
    await tokenInstance.lock(lockReason,10,60,{from: accounts[0]})
    let balance = await tokenInstance.balanceOf(contractAdderss);
    assert.equal(balance.toNumber(), 10,'tokens are transfered to the address of contract');
    let amount = await tokenInstance.tokensLocked(accounts[0], lockReason);
    assert.equal(amount.toNumber(),10,'tokens are locked for the address of sender');
    //trying to lock more tokens with the same reason
    try {
      await tokenInstance.lock(lockReason,10,60,{from: accounts[0]});
    } catch (error006) {
      assert(error006.message.indexOf('revert')>= 0, 'canot lock for the same reason');
    }
    //trying to lock 0 tokens
    try {
      await tokenInstance.lock(lockReason2,0,60,{from: accounts[0]});
    } catch (error005) {
      assert(error005.message.indexOf('revert')>= 0, 'canot lock 0 amount');
    }
    await tokenInstance.transfer(fromAccount, 100, {from: accounts[0]});
    //trying to lock a more than on the balance
    try {
      await await tokenInstance.lock(lockReason2,200,60,{from: fromAccount});
    } catch (error007) {
      assert(error007.message.indexOf('revert')>= 0, 'canot lock amounts greater then the balance' );
    }
    const {logs} = await  tokenInstance.lock(lockReason2,30,60,{from: fromAccount});
    await findCurrentBlockTimestamp();
    assert.equal(logs.length, 2, 'triggers two events');
    assert.equal(logs[0].event, 'Transfer', 'should be the Transfer event');
    assert.equal(logs[0].args._from, fromAccount, 'logs the account tokens are tansferred from');
    assert.equal(logs[0].args._to, contractAdderss, 'logs the account tokens are tansferred to');
    assert.equal(logs[0].args._value.toNumber(), 30, 'logs the transfer amount');
    assert.equal(logs[1].event, 'Locked', 'should be the Locked event');
    assert.equal(logs[1].args._of, fromAccount, 'logs the account locking the amount');
    assert.equal(web3.utils.toUtf8(logs[1].args._reason),web3.utils.toUtf8(lockReason2) , 'logs the reason for locking the tokens');
    assert.equal(logs[1].args._amount.toNumber(), 30, 'logs the lock amount');
    assert.equal((logs[1].args._validity.toNumber()), (currentBlockTimestamp+60), 'logs the lock length');
  })
  //after this test the balance of contract is already 40

  it('handles the lock of the tokens with a transfer to another address (transferWithLock)', async function(){
    fromAccount = accounts[2];
    toAccount = accounts[3];
    contractAdderss = tokenInstance.address;
    lockReason3 = web3.utils.asciiToHex('test3');
    lockReason4 = web3.utils.asciiToHex('test4');
    lockReason5 = web3.utils.asciiToHex('test5');
    let balanceFrom = await tokenInstance.balanceOf(fromAccount);
    assert.equal(balanceFrom.toNumber(), 160,'balance for from_account should be 160 now');
    let balanceTo = await tokenInstance.balanceOf(toAccount);
    assert.equal(balanceTo.toNumber(), 10,'balance for to_account should be 10 now');
    let balanceContract = await tokenInstance.balanceOf(contractAdderss);
    assert.equal(balanceContract.toNumber(), 40,'balance for address of contract should be 40 now');
    await findCurrentBlockTimestamp();
    const {logs} = await tokenInstance.transferWithLock(toAccount, lockReason3,15,120,{from: fromAccount});
    assert.equal(logs.length, 2, 'triggers two events');
    assert.equal(logs[0].event, 'Transfer', 'should be the Transfer event');
    assert.equal(logs[0].args._from, fromAccount, 'logs the account tokens are tansferred from');
    assert.equal(logs[0].args._to, contractAdderss, 'logs the account tokens are tansferred to');
    assert.equal(logs[0].args._value.toNumber(), 15, 'logs the transfer amount');
    assert.equal(logs[1].event, 'Locked', 'should be the Locked event');
    assert.equal(logs[1].args._of, toAccount, 'logs the account the amount is locked for');
    assert.equal(web3.utils.toUtf8(logs[1].args._reason),web3.utils.toUtf8(lockReason3) , 'logs the reason for locking the tokens');
    assert.equal(logs[1].args._amount.toNumber(), 15, 'logs the lock amount');
    assert(logs[1].args._validity.toNumber(), currentBlockTimestamp+120, 'logs the transferWithLock length');
    let balance = await tokenInstance.balanceOf(contractAdderss);
    assert.equal(balance.toNumber(), 55,'tokens are transfered to the address of contract');
    let amount = await tokenInstance.tokensLocked(toAccount, lockReason3);
    assert.equal(amount.toNumber(),15,'tokens are locked for the address of sender');
    //trying to lock for the same reason
    try {
      await tokenInstance.transferWithLock(toAccount, lockReason3,15,60,{from: fromAccount});
    } catch (error01) {
      assert(error01.message.indexOf('revert')>= 0, 'canot lock for the same reason');
    }
    //trying to lock 0 tokens
    try {
      await tokenInstance.transferWithLock(toAccount, lockReason5,0,60,{from: fromAccount});
    } catch (error02) {
      assert(error02.message.indexOf('revert')>= 0, 'canot lock 0 amount');
    }
    //trying to lock a more than on the balance
    try {
      await tokenInstance.transferWithLock(toAccount, lockReason4,1000,60,{from: fromAccount});
    } catch (error03) {
      assert(error03.message.indexOf('revert')>= 0, 'canot transferWithLock amounts greater then the balance');
    }
  })

  it('checks that function displays a correct number of tokens locked at a time (tokensLockedAtTime)', async function(){
    await tokenInstance.transferWithLock(toAccount, lockReason4,15,45, {from: fromAccount});
    await findCurrentBlockTimestamp();
    let amount = await tokenInstance.tokensLockedAtTime(toAccount, lockReason4, currentBlockTimestamp + 40)
    assert.equal(amount.toNumber(), 15, 'ammount should be locked at specific time for specific reason');
  })

  it('views total balance with locked tokens (totalBalanceOf)', async function () {
    let totalBalanceFromAccount = await tokenInstance.totalBalanceOf(fromAccount);
    assert.equal(totalBalanceFromAccount.toNumber(),160, 'is not the correct balance of fromAccount including locked tokens')
    let totalBalanceToAccount = await tokenInstance.totalBalanceOf(toAccount);
    assert.equal(totalBalanceToAccount.toNumber(),40, 'is not the correct balance of toAccount including locked tokens')
  });

  /*
  FOR THE REFERENCE
  fromAccount has 130 available + 30 locked lockReason2_for_15
  toAccount has 10 available + (15 lockReason3_for_120 + 15 lockReason4_for_45) locked
  */

  it('extends the lock validity (extendLock)', async function (){
    try {
      await tokenInstance.extendLock(lockReason,30,{from: fromAccount});
    } catch (error) {
      assert(error.message.indexOf('revert')>= 0, 'there where no tokens locked for this reason');
      let validityBefore = await tokenInstance.locked(fromAccount,lockReason2);
      await tokenInstance.extendLock(lockReason2,50,{from: fromAccount});
      let validityAfter = await tokenInstance.locked(fromAccount,lockReason2);
      assert.equal(validityBefore[1].toNumber()+50,validityAfter[1].toNumber(), 'validity before extend should be increased ')
        try {
          await tokenInstance.extendLock(lockReason2,0,{from: fromAccount});
        } catch (error2) {
          assert(error2.message.indexOf('revert')>= 0, 'it should not be possible to extend for negative time');
        }
      const {logs} = await tokenInstance.extendLock(lockReason2,50,{from: fromAccount});
      assert.equal(logs[0].event, 'Locked', 'should be the Locked event');
      assert.equal(logs[0].args._of, fromAccount, 'logs the account the amount is locked for');
      assert.equal(web3.utils.toUtf8(logs[0].args._reason), web3.utils.toUtf8(lockReason2) , 'logs the reason for locking the tokens');
      assert.equal(logs[0].args._amount.toNumber(), 30, 'logs the lock amount');
      assert.equal(logs[0].args._validity.toNumber(), validityAfter[1].toNumber()+50, 'logs the lock time');
      return true
    }
    throw new Error("No error was thrown")
  });


  /*FOR THE REFERENCE
  fromAccount has 130 available + 30 locked lockReason2_for_115(15+50+50)
  toAccount has 10 available + 30 locked (15 lockReason3_for_120 + 15 lockReason4_for_45)
  */
  it('increases the amount of tokens locked for a specific reason (increaseLockAmount)', async function (){
    try {
      await tokenInstance.increaseLockAmount(lockReason,30,{from: fromAccount});
    } catch (error) {
      assert(error.message.indexOf('revert')>= 0, 'there where no tokens locked for this reason');
      let contactBalanceBefore = await tokenInstance.balanceOf(contractAdderss);
      let validityBefore = await tokenInstance.locked(fromAccount,lockReason2);
      const {logs} = await tokenInstance.increaseLockAmount(lockReason2, 10, {from: fromAccount});
      assert.equal(logs.length, 2, 'triggers two events');
      assert.equal(logs[0].event, 'Transfer', 'should be the Transfer event');
      assert.equal(logs[0].args._from, fromAccount, 'logs the account tokens are tansferred from');
      assert.equal(logs[0].args._to, contractAdderss, 'logs the account tokens are tansferred to');
      assert.equal(logs[0].args._value.toNumber(), 10, 'logs the transfer amount');
      assert.equal(logs[1].event, 'Locked', 'should be the Locked event');
      assert.equal(logs[1].args._of, fromAccount, 'logs the account the amount is locked for');
      assert.equal(web3.utils.toUtf8(logs[1].args._reason),web3.utils.toUtf8(lockReason2) , 'logs the reason for locking the tokens');
      assert.equal(logs[1].args._amount.toNumber(), 40, 'logs the lock amount');
      assert.equal(logs[1].args._validity.toNumber(), validityBefore[1].toNumber(), 'logs the transferWithLock length');
      let contactBalanceAfter = await tokenInstance.balanceOf(contractAdderss);
      assert.equal(contactBalanceBefore.toNumber()+10, contactBalanceAfter.toNumber(), '10 tokens were transfered to contract address');
      return true
    }
    throw new Error("No error was thrown")
  })

  /*
  FOR THE REFERENCE
  fromAccount has 130 available + (30+10) locked lockReason2_for_115(15+50+50)
  toAccount has 10 available + 30 locked (15 lockReason3_for_120 + 15 lockReason4_for_45)
  */
  it('can view correctly unlockable tokens (getUnlockableTokens)', async function () {
    const lockValidityExtended = await tokenInstance.locked(toAccount, lockReason3);
    const balance = await tokenInstance.balanceOf(toAccount);
    const totalBalance = await tokenInstance.totalBalanceOf(toAccount)
    const tokensLocked = totalBalance - balance;
    await findCurrentBlockTimestamp();
    await advanceTimeAndBlock(lockValidityExtended[1].toNumber() + 60 - currentBlockTimestamp);
    var unlockableToken = await tokenInstance.getUnlockableTokens(toAccount);
    assert.equal(unlockableToken.toNumber(), tokensLocked, 'tokens should be awailable for unlock after the time has passed');
  });

  it('should show 0 lock amount for unknown reasons (tokensLocked)', async function() {
    const actualLockedAmount = await tokenInstance.tokensLocked(fromAccount, lockReason5);
    assert.equal(actualLockedAmount.toNumber(), 0);
  });

  it('handles the unlock of tokens correctly (unlcok)', async function (){
    unlockableToken = await tokenInstance.getUnlockableTokens(toAccount);
    balance = await tokenInstance.balanceOf(toAccount);
    totalBalance = await tokenInstance.totalBalanceOf(toAccount)
    tokensLocked = totalBalance - balance;
    assert(tokensLocked > 0 , 'should be locked more than 0 at the moment');
    assert.equal(unlockableToken.toNumber(), tokensLocked, 'all of the locked tokens should be awailable for unlock after the time has passed');
    balance = await tokenInstance.balanceOf(toAccount);
    totalBalance = await tokenInstance.totalBalanceOf(toAccount);
    await tokenInstance.unlock(toAccount);
    balanceAfterUnlock = await tokenInstance.balanceOf(toAccount)
    assert.equal(balanceAfterUnlock.toNumber(), totalBalance, 'tokens should be unlocked and transferred to the account')

    /*
    FOR THE REFERENCE
    fromAccount has 130 available + (30+10) locked lockReason2_for_TIME_PASSED(15+50+50)
    toAccount has 40 available + 0 locked (0 lockReason3_for_120 + 0 lockReason4_for_45)
    */
    //does not allow double unlock
    balance = await tokenInstance.balanceOf(toAccount);
    totalBalance = await tokenInstance.totalBalanceOf(toAccount)
    unlockableToken = await tokenInstance.getUnlockableTokens(toAccount);
    assert.equal(unlockableToken.toNumber(), 0, 'should not have any tokens for unlock after they have been released');
    assert.equal(balance.toNumber(), totalBalance.toNumber(), 'double-check that locked tokens amount = 0');
    const {logs} = await tokenInstance.unlock(toAccount);
    assert.equal(logs.length, 0, 'should not trigger any event');
    balanceAfterUnlock = await tokenInstance.balanceOf(toAccount);
    assert.equal(balanceAfterUnlock.toNumber(), balance.toNumber(), 'tokens should be unlocked and transferred to the account')
    //should allow to lock token again
    await tokenInstance.lock(lockReason3,10,60,{from: toAccount});
    balance = await tokenInstance.balanceOf(toAccount);
    totalBalance = await tokenInstance.totalBalanceOf(toAccount);
    assert.equal(balance.toNumber(), totalBalance.toNumber()-10, 'it should be possible to lock tokens for the same reason after ulock')

    /*
    FOR THE REFERENCE
    fromAccount has 130 available + (30+10) locked lockReason2_for__TIME_PASSED(15+50+50)
    toAccount has 30 available + 10 locked (10 lockReason3_for_60 + 0 lockReason4_for_45)
    */
    //should allow transfer with lock again after claiming
    await tokenInstance.transferWithLock(toAccount, lockReason4,30, 120, {from: fromAccount});
    totalBalance = await tokenInstance.totalBalanceOf(toAccount);
    assert.equal(balance.toNumber(), totalBalance.toNumber() - 10 - 30, 'it should be possible to transferWithLock tokens for the same reason after ulock')
  });

  /*
  FOR THE REFERENCE
  fromAccount has 100 available + (30+10) locked lockReason2_for__TIME_PASSED(15+50+50)
  toAccount has 30 available + 40 locked (10 lockReason3_for_60 + 30 lockReason4_for_120)
  */
});
