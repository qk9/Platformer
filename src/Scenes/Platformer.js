class Platformer extends Phaser.Scene {
    constructor() {
        super("platformer");
    }

    preload() {
        this.load.setPath("./assets/");

        // tilemap data
        this.load.image("tileset", "tileset_merged.png");
        this.load.tilemapTiledJSON("map", "level_testing.tmj");

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

        this.map = this.add.tilemap("map", 34, 34, 15, 100);
        this.tileset = this.map.addTilesetImage("tileset_merged_v1", "tileset");

        this.backgroundLayer = this.map.createLayer("background", this.tileset, 0, 0);
        this.platforms = this.map.createLayer("physical", this.tileset, 0, 0);
        this.foreground = this.map.createLayer("foreground", this.tileset, 0, 0);

        this.platforms.setCollisionByProperty({
            collides: true
        });

        this.controls = {};
        this.controls.left = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.controls.right = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.controls.jump = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.controls.dash = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.controls.storeVelo = this.input.activePointer;

        this.player = new Player(this, 250, game.config.height - 200, this.controls, "playerTwirlSlow", "playerTwirlFast", 3, null);

        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.init_BackgroundColor();
    }

    update(time, delta) {
        this.doBackgroundColor();
        this.player.update(time, delta);

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

    init_BackgroundRect() {
        this.backgroundRect = new Phaser.Geom.Rectangle(0, game.config.height - 10, game.config.width, 10)
        this.backgroundGraphics = this.add.graphics();
        this.children.sendToBack(this.backgroundGraphics);
        this.backgroundGraphics.fillStyle(0xff0000, 1);
        this.backgroundGraphics.fillRectShape(this.backgroundRect);
        this.cameras.main.setBackgroundColor(0x00ff00);
        this.oldRectHeight = 10;
    }

    doBackgroundRect() {
        let camera = this.cameras.main;
        let newRectHeight = (0.9 * this.oldRectHeight) + (0.1 * ((game.config.height) * Math.abs(this.player.body.velocity.x / this.player.body.maxVelocity.x) + 10));
        this.backgroundRect.setPosition(camera.worldView.x, game.config.height - newRectHeight);
        this.backgroundRect.height = newRectHeight;
        this.backgroundGraphics.clear();
        this.backgroundGraphics.fillStyle(0xff0000, 0.5 + (newRectHeight / game.config.height / 2));
        this.backgroundGraphics.fillRectShape(this.backgroundRect);
        this.oldRectHeight = newRectHeight;
    }

    // must init this.player first
    init_BackgroundCircle() {
        this.backgroundCircle = new Phaser.Geom.Circle(this.player.body.x, this.player.body.y, this.player.bodySize);
        this.backgroundGraphics = this.add.graphics();
        this.children.sendToBack(this.backgroundGraphics);
        this.backgroundGraphics.fillStyle(0xff0000, 0.1);
        this.backgroundGraphics.fillCircleShape(this.backgroundCircle);
        this.cameras.main.setBackgroundColor(0x00ff00);
        this.oldCircleRadius = this.player.bodySize;
    }

    doBackgroundCircle() {
        let playerSpeedRatio = Math.abs(this.player.body.velocity.x / this.player.body.maxVelocity.x);
        let newCircleRadius = (0.9 * this.oldCircleRadius) + (0.1 * (((250 * playerSpeedRatio) + this.player.bodySize) / 2));
        this.backgroundCircle.setTo(this.player.body.position.x + this.player.bodySize / 2, this.player.body.position.y + this.player.bodySize / 2, newCircleRadius);
        this.backgroundGraphics.clear();
        this.backgroundGraphics.fillStyle(0xff0000, 0.1 + (0.9 * playerSpeedRatio));
        this.backgroundGraphics.slice(this.backgroundCircle.x, this.backgroundCircle.y, this.backgroundCircle.radius, Math.PI / 2, Math.PI * 2 * playerSpeedRatio + (Math.PI / 2));
        this.backgroundGraphics.fillPath();

        this.oldCircleRadius = newCircleRadius;
    }
}