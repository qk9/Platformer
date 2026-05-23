class Platformer extends Phaser.Scene {
    constructor() {
        super("platformer");
    }

    preload() {
        this.load.setPath("./assets/");

        // tilemap data
        this.load.image("tileset", "Tileset_Hyperphantasia.png");
        this.load.tilemapTiledJSON("map", "level_one.tmj");

        // player sprites
        this.load.image("playerTexture", "kenney_light-masks-1.0/Transparent/circle_c_streaks_resized.png");
        this.load.image("playerTwirlSlow", "twirl_slow_resized.png");
        this.load.image("playerTwirlFast", "twirl_fast_resized.png");
    }

    create() {
        this.init_platformer();
    }

    init_platformer() {

        this.physics.world.gravity.y = 1500;

        this.cameras.main.setBackgroundColor(0xffffff);
        this.cameras.main.setViewport(0, 0, game.config.width, game.config.height);

        if (!Object.hasOwn(this, "map")) {
            this.init_tilemap();
        }
        else {
            this.map.destroy();
            this.tileset = null;
            this.background = null;
            this.platforms = null;
            this.foreground = null;
            
            this.init_tilemap();
        }

        this.input.keyboard.removeAllKeys(true);

        this.controls = {};
        this.controls.left = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.controls.right = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.controls.jump = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.controls.dash = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.controls.storeVelo = this.input.activePointer;
        this.controls.reset = null;

        this.player = new Player(this, 220, game.config.height - 200, this.controls, "playerTwirlSlow", "playerTwirlFast", 3, null);

        this.gameIsOver = false;

        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.init_BackgroundColor();

        this.startGraphics = this.add.graphics();
        this.children.sendToBack(this.startGraphics);
        this.startGraphicsRadius = 1;
        this.startGraphics.fillCircle(this.player.x, this.player.y, this.startGraphicsRadius);
        this.startTween = this.add.tween({
            targets: this,
            startGraphicsRadius: this.sys.scale.width * 1.2,
            ease: 'Quad.easeOut',
            duration: 1000
        });
        this.startTween.play();
        this.cameras.main.setMask(this.startGraphics.createGeometryMask());

        this.timeElapsed = 0;
    }

    init_tilemap() {
        this.map = this.add.tilemap("map", 34, 34, 20, 500);
        this.tileset = this.map.addTilesetImage("Tileset_Hyperphantasia_v1", "tileset");

        this.background = this.map.createLayer("background", this.tileset, 0, 0);
        this.platforms = this.map.createLayer("physical", this.tileset, 0, 0);
        this.foreground = this.map.createLayer("foreground", this.tileset, 0, 0);

        this.platforms.setCollisionByProperty({
            collides: true
        });
    }

    update(time, delta) {
        if (this.startGraphics != null) {
            this.startGraphics.clear();
            if (this.startGraphicsRadius >= this.sys.scale.width * 1.2) {
                this.startGraphics.destroy();
                this.cameras.main.clearMask(true);
                this.startGraphics = null;
                this.startGraphicsRadius = null;
            }
            else {
                this.startGraphics.fillCircle(this.player.x, this.player.y, this.startGraphicsRadius);
                this.cameras.main.clearMask(true);
                this.cameras.main.setMask(this.startGraphics.createGeometryMask());
            }
        }
        if (!this.gameIsOver) {
            this.doBackgroundColor();
            this.timeElapsed += delta;
            this.player.update(time, delta);
        }
        else {

        }

        // debug: log FPS
        //console.log(Math.floor(1000 / delta));
    }

    init_BackgroundColor() {
        this.oldHue = 1 / 3;
    }

    doBackgroundColor() {
        let hue = 0.9 * this.oldHue + 0.1 * (1 / 3 * (1 - Math.abs(this.player.body.velocity.x / this.player.body.maxVelocity.x)));
        this.cameras.main.setBackgroundColor(Phaser.Display.Color.HSVToRGB(hue, 1, 1).color);
        this.oldHue = hue;

    }

    triggerGameOver() {
        this.player.deleteSubObjects();
        this.player.destroy();
        this.input.keyboard.removeAllKeys(true);
        this.gameIsOver = true;
        this.controls.reset = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.controls.reset.on("down", this.init_platformer, this);
    }
}