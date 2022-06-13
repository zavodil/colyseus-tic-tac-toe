import * as PIXI from 'pixi.js'
import * as nearAPI from "near-api-js";
import {callJsvm, viewJsvm} from '../near'

import Application from '../Application'
import GameScreen from './GameScreen'

export default class TitleScreen extends PIXI.Container {

    constructor() {
        super()

        this.title = new PIXI.Sprite.fromImage("images/logo.png")
        this.title.pivot.x = this.title.width / 2
        this.addChild(this.title)

        this.loadingText = new PIXI.Text("Loading...", {
            font: "36px JennaSue",
            fill: 0x000,
            textAlign: 'center'
        });
        this.loadingText.pivot.x = this.loadingText.width / 2
        this.loadingText.pivot.y = this.loadingText.height / 2;
        this.addChild(this.loadingText)

        this.colyseus = new PIXI.Sprite.fromImage('images/colyseus.png')
        this.colyseus.alpha = 0.6
        this.colyseus.pivot.x = this.colyseus.width / 2
        this.addChild(this.colyseus)

        this.instructionText = new PIXI.Text("", {
            font: "62px JennaSue",
            fill: 0x000,
            textAlign: 'center'
        })
        this.addChild(this.instructionText)

        this.interactive = true

        this.on('dispose', this.onDispose.bind(this))

        this.checkSignIn()
            .then((isSignedIn) => {
                if(isSignedIn) {
                    this.waitForGameStart();
                }
            });

        this.onResize()
    }

    transitionIn() {
        tweener.add(this.title).from({y: this.title.y - 10, alpha: 0}, 300, Tweener.ease.quadOut)
        tweener.add(this.colyseus).from({y: this.colyseus.y + 10, alpha: 0}, 300, Tweener.ease.quadOut)
        return tweener.add(this.instructionText).from({alpha: 0}, 300, Tweener.ease.quadOut)
    }

    transitionOut() {
        tweener.remove(this.title)
        tweener.remove(this.colyseus)
        tweener.remove(this.instructionText)

        tweener.add(this.title).to({y: this.title.y - 10, alpha: 0}, 300, Tweener.ease.quintOut)
        tweener.add(this.colyseus).to({y: this.colyseus.y + 10, alpha: 0}, 300, Tweener.ease.quintOut)
        return tweener.add(this.instructionText).to({alpha: 0}, 300, Tweener.ease.quintOut)
    }

    getGame() {
        return viewJsvm( "get_game", "")
            .then(game => {
                console.log(game)
                const players = game[1];
                let locked = game[4];
                if (!players.includes(null) && players.includes(window.wallet.getAccountId())) {
                    console.log("Game found");
                    clearInterval(this.startTimeout);
                    this.emit('goto', GameScreen);
                }
                else if (locked) {
                    this.instructionText.text = `Board is occupied by \n${game[1][0]} and ${game[1][1]}.\nPlease wait...`;
                    this.instructionText.pivot.x = this.instructionText.width / 2
                    this.instructionText.pivot.y = this.instructionText.height / 2
                }
                else {
                    if (players[0] === window.wallet.getAccountId() && players[1] === null) {
                        this.instructionText.text = "Waiting for opponent...";
                    } else {
                        this.instructionText.text = "Click to start";
                    }
                    this.instructionText.pivot.x = this.instructionText.width / 2
                    this.instructionText.pivot.y = this.instructionText.height / 2

                    this.once('click', this.startGame.bind(this))
                    this.once('touchstart', this.startGame.bind(this))
                }
                return game;
            });
    }

    waitForGameStart() {
        this.startTimeout = setInterval(() => {
            this.getGame()
        }, 1000);
    }

    async checkSignIn() {
        let isSignedIn = window.wallet.isSignedIn();
        if (isSignedIn) {
            this.nearAccount = new PIXI.Text(window.wallet.getAccountId(), {
                font: "36px JennaSue",
                fill: 0x000,
                textAlign: 'center'
            });
            this.nearAccount.x = Application.WIDTH -  this.nearAccount.width - Application.MARGIN / 2;
            this.nearAccount.y = Application.MARGIN / 2;
            this.addChild(this.nearAccount)
        } else {
            this.instructionText.text = "Login with NEAR wallet";
            this.instructionText.pivot.x = this.instructionText.width / 2
            this.instructionText.pivot.y = this.instructionText.height / 2
            this.once('click', await this.loginWallet.bind(this))
            this.once('touchstart', this.loginWallet.bind(this))
        }
        this.loadingText.visible = false;
        return isSignedIn;
    }

    async loginWallet() {
        await window.wallet.requestSignIn(
            window.config.jsvmAccountId,
            "Tic-Tac-Toe on NEAR",
        );
    }


    async startGame() {
        this.loadingText.visible = true;

        callJsvm("onJoin", "", nearAPI.utils.format.parseNearAmount("0.01"))
            .then(game => {
                this.loadingText.visible = false;
                console.log(game)
            });
    }

    onResize() {
        this.title.x = Application.WIDTH / 2;
        this.title.y = Application.MARGIN

        this.loadingText.x = Application.WIDTH / 2
        this.loadingText.y = Application.MARGIN + this.title.height + Application.MARGIN / 2;

        this.instructionText.x = Application.WIDTH / 2
        this.instructionText.y = Application.HEIGHT / 2 - this.instructionText.height / 3.8

        this.colyseus.x = Application.WIDTH / 2
        this.colyseus.y = Application.HEIGHT - this.colyseus.height - Application.MARGIN / 3
    }

    onDispose() {
        window.removeEventListener('resize', this.onResizeCallback)
    }

}




