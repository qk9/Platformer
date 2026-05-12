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

        /*this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        this.speed = 200;*/

        this.controls = {};
        this.controls.left = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.controls.right = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.controls.jump = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.controls.dash = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        this.player = new Player(this, 250, game.config.height - 200, this.controls, 3, "playerTexture", null);

        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        console.log("player initialized");
    }

    update(time, delta) {
        let camera = this.cameras.main;
        let color = 0x000000;
        let colorSegment = Math.floor(0xff * ((Math.cos(this.player.body.velocity.x / this.player.body.maxVelocity.x * Math.PI) / 2) + 0.5));
        let colorSegment2 = Math.floor(0xff * ((Math.cos(this.player.body.velocity.x / this.player.body.maxVelocity.x * Math.PI) / -2) + 0.5));
        color += colorSegment << 8;
        color += colorSegment2 << 16;
        this.cameras.main.setBackgroundColor(color);


        


        /*if (camera.scrollX > this.map.widthInPixels - (camera.worldView.width)) {
            camera.scrollX = this.map.widthInPixels - (camera.worldView.width);
        }
        if (camera.scrollX < 0) {
            camera.scrollX = 0;
        }*/

        this.player.update(time, delta);
    }
}