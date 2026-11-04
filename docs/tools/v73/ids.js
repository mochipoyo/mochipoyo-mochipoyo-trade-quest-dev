const path='/home/claude/mochipoyo-trade-quest/js/'; global.window=undefined; const CONFIG=require(path+'config.js'); const Indicators=require(path+'indicators.js'); global.CONFIG=CONFIG; global.Indicators=Indicators; const S=require(path+'scenarios.js'); global.Scenarios=S; require(path+'data/scenarios-extra.js');
process.stdout.write(JSON.stringify(S.ids()));
