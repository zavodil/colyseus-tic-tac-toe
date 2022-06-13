import * as PIXI from 'pixi.js'

import Application from '../Application'
import EndGameScreen from './EndGameScreen'

import Board from '../components/Board'
import {callJsvm, viewJsvm} from '../near'

export default class GameScreen extends PIXI.Container {

  constructor () {
    super()

    this.waitingText = new PIXI.Text("Loading...", {
      font: "100px JennaSue",
      fill: '#000',
      textAlign: 'center'
    })
    this.waitingText.pivot.x = this.waitingText.width / 2
    this.waitingText.pivot.y = this.waitingText.height / 2
    this.addChild(this.waitingText)

    this.on('dispose', this.onDispose.bind(this))

    this.playerValue = 0;
    this.turnsCounter = -1;
    this.currentTurn = "";
    this.board = new Board()


    this.checkSignIn()
        .then(() => {

        });

    this.onResize()
  }


  async checkSignIn() {
    if (window.wallet.isSignedIn()) {
      this.userAccountId = window.wallet.getAccountId();
      this.nearAccount = new PIXI.Text(this.userAccountId, {
        font: "36px JennaSue",
        fill: 0x000,
        textAlign: 'center'
      });
      this.nearAccount.x = Application.WIDTH -  this.nearAccount.width - Application.MARGIN / 2;
      this.nearAccount.y = Application.MARGIN / 2;
      this.addChild(this.nearAccount)

      this.connect();
    }
  }

  drawFigure(value, index) {
    const x = index % 3;
    const y = Math.floor(index / 3);
    this.board.set(x, y, value);
  }

  getGame() {
    return viewJsvm( "get_game", "").then(game => {
      let locked = game[4];
      const winner = game[5];
      const draw = game[6];

      if(winner || draw){
        clearInterval(this.gameTimeout);

        if(winner)
          this.showWinner(winner);
        if(draw)
          this.drawGame(winner);
      }

      else {
        if (game[1].includes(this.userAccountId) || !locked) {
          const turns = game[0].filter(value => value !== null).length;
          if (turns > this.turnsCounter && turns < 9) {
            console.log(game)
            this.turnsCounter = turns;
            this.playerValue = game[1][0] === this.userAccountId ? 1 : 2;
            game[0].map((value, index) => this.drawFigure(value, index));
            this.currentTurn = game[2];
            this.nextTurn(this.currentTurn);
          }
        } else {
          //this.emit('goto', TitleScreen)
        }
      }
    });
  }

  async connect () {
    this.getGame()

    this.gameTimeout = setInterval(() => {
      this.getGame()
    }, 1000);

    this.onJoin();
  }

  transitionIn () {
    tweener.add(this.waitingText).from({ alpha: 0 }, 300, Tweener.ease.quintOut)
    return tweener.add(this.waitingText.scale).from({x: 1.5, y: 1.5}, 300, Tweener.ease.quintOut)
  }

  transitionOut () {
    if (this.timeIcon) {
      tweener.add(this.timeIcon).to({y: this.timeIcon.y - 10, alpha: 0}, 300, Tweener.ease.quintOut)
      tweener.add(this.timeRemaining).to({y: this.timeRemaining.y - 10, alpha: 0}, 300, Tweener.ease.quintOut)
      tweener.add(this.board).to({ alpha: 0 }, 300, Tweener.ease.quintOut)
      return tweener.add(this.statusText).to({ y: this.statusText.y + 10, alpha: 0 }, 300, Tweener.ease.quintOut)

    } else {
      return tweener.add(this.waitingText).to({ alpha: 0 }, 300, Tweener.ease.quintOut)
    }
  }

  onJoin () {
    // not waiting anymore!
    this.removeChild(this.waitingText)

    this.timeIcon = new PIXI.Sprite.fromImage('images/clock-icon.png')
    this.timeIcon.pivot.x = this.timeIcon.width / 2
    this.addChild(this.timeIcon)

    this.timeRemaining = new PIXI.Text("99", {
      font: "60px JennaSue",
      fill: 0x000000,
      textAlign: 'center'
    })
    this.timeRemaining.pivot.x = this.timeRemaining.width / 2
    this.addChild(this.timeRemaining)

    this.board.pivot.x = this.board.width / 2
    this.board.pivot.y = this.board.height / 2
    this.board.on('select', this.onSelect.bind(this))
    this.addChild(this.board)

    this.statusText = new PIXI.Text("Your move!", {
      font: "100px JennaSue",
      fill: 0x000,
      textAlign: 'center'
    })
    this.statusText.pivot.y = this.statusText.height / 2
    this.statusText.visible = false;
    this.addChild(this.statusText)

    this.countdownInterval = clock.setInterval(this.turnCountdown.bind(this), 1000)

    this.onResize()
  }

  onSelect (x, y) {
    if(this.userAccountId && this.playerValue && this.userAccountId === this.currentTurn) {
      this.nextTurn("");
      this.turnsCounter++;
      this.board.set(x, y, this.playerValue);
      callJsvm("playerAction", JSON.stringify({data: { x: x, y: y }})).then(game => {
        console.log(game)
      }).catch((error) => {
        console.log("error");
        window.location.reload();
      });
    }
  }

  nextTurn (playerId) {
    tweener.add(this.statusText).to({
      y: Application.HEIGHT - Application.MARGIN + 10,
      alpha: 0
    }, 200, Tweener.ease.quintOut).then(() => {

      if (playerId == this.userAccountId) {
        this.statusText.text = "Your move!"

      } else {
        this.statusText.text = "Opponent's turn..."
      }

      this.statusText.x = Application.WIDTH / 2 - this.statusText.width / 2
      this.statusText.visible = true;

      tweener.add(this.statusText).to({
        y: Application.HEIGHT - Application.MARGIN,
        alpha: 1
      }, 200, Tweener.ease.quintOut)

    })

    this.timeRemaining.style.fill = '#000000';
    this.timeRemaining.text = "100"
    this.countdownInterval.reset()
  }

  turnCountdown () {
    var currentNumber = parseInt(this.timeRemaining.text, 10) - 1

    if (currentNumber >= 0) {
      this.timeRemaining.text = currentNumber.toString()
    }

    if (currentNumber <= 3) {
      this.timeRemaining.style.fill = '#934e60';
    } else {
      this.timeRemaining.style.fill = '#000000';
    }

  }

  drawGame () {
    this.emit('goto', EndGameScreen, { draw: true })
  }

  showWinner (playerId) {
    this.emit('goto', EndGameScreen, {
      won: (this.userAccountId == playerId)
    })
  }

  onResize () {
    this.waitingText.x = Application.WIDTH / 2
    this.waitingText.y = Application.HEIGHT / 2

    if (this.timeIcon) {
      var margin = Application.HEIGHT / 100 * 6

      this.timeIcon.x = Application.WIDTH / 2 - this.timeIcon.pivot.x
      this.timeIcon.y = margin

      this.timeRemaining.x = Application.WIDTH / 2 + this.timeIcon.pivot.x
      this.timeRemaining.y = margin

      this.board.x = Application.WIDTH / 2
      this.board.y = Application.HEIGHT / 2

      this.statusText.x = Application.WIDTH / 2 - this.statusText.width / 2
      this.statusText.y = Application.HEIGHT - margin
    }
  }

  onDispose () {
  }

}
