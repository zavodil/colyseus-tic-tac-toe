import * as PIXI from 'pixi.js'
import Application from './Application';
import TitleScreen from './screens/TitleScreen'
import {getConfig} from "./near";
import * as nearAPI from "near-api-js";

var loader = new PIXI.loaders.Loader();
loader.add('logo', 'images/logo.png')
loader.add('background', 'images/background.jpg')
loader.add('colyseus', 'images/colyseus.png')

loader.add('clock-icon', 'images/clock-icon.png')
loader.add('board', 'images/board.png')

loader.on('complete', () => {
  var loading = document.querySelector('.loading');
  document.body.removeChild(loading);

  connect().then(() => {
    var app = new Application()
    app.gotoScene (TitleScreen)
    app.update()
      }
  )
})

loader.load();

let connect = async function () {
  window.config = getConfig(process.env.NODE_ENV || 'development');
  window.config.keyStore = new nearAPI.keyStores.BrowserLocalStorageKeyStore();
  window.near = await nearAPI.connect(window.config);
  window.wallet = new nearAPI.WalletConnection(window.near, "tic_tac_toe_game");

  window.contract = await new nearAPI.Contract(
      window.wallet.account(),
      window.config.contractName,
      {
        // name of contract you're connecting to
        viewMethods: ["get_game"], // view methods do not change state but usually return a value
        changeMethods: ["onCreate", "onJoin", "playerAction"], // change methods modify state
      }, {
        jsContract: true
      }
  );
}
