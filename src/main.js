"use strict"

// game config
let config = {
    parent: 'phaser-game',
    type: Phaser.CANVAS,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: {
                x: 0,
                y: 0
            },
            fps: 120
        }
    },
    width: 2400,
    height: 1280,
    autoCenter: true,
    scaleMode:Phaser.Scale.ScaleModes.FIT,
    scene: [Title, Platformer] // TODO: add scenes
}

const game = new Phaser.Game(config);