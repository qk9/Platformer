class Title extends Phaser.Scene {
    constructor() {
        super("title");
    }

    preload() {
        this.load.setPath("./assets/");
        this.load.image("titleScreen", "title_screen.png");
    }

    create() {
        // create title screen graphic
        this.title = this.add.sprite(0, 0, "titleScreen");
        this.title.displayHeight = this.sys.scale.height;
        this.title.displayWidth = this.sys.scale.width;
        this.title.setOrigin(0.5, 0.5);
        this.title.setPosition(this.title.displayWidth / 2, this.title.displayHeight / 2);

        // create background color
        this.background = this.add.graphics();
        this.children.sendToBack(this.background);
        this.backgroundGeom = new Phaser.Geom.Rectangle(0, 0, this.title.displayWidth, this.title.displayHeight);
        this.hue = 1/3;
        this.hsvValue = 0;
        this.background.fillStyle(Phaser.Display.Color.HSVToRGB(this.hue, 1, this.hsvValue).color, 1);
        this.background.fillRectShape(this.backgroundGeom);

        // create base background animation
        this.scaleTween = this.add.tween({
            targets: this.title,
            displayWidth: '*=1.02',
            ease: 'Quad.easeInOut',
            duration: 4000,
            repeat: -1,
            yoyo: true
        });
        this.scaleTween.play;
        this.hueTween = this.add.tween({
            targets: this,
            hue: 0,
            ease: 'Quad.easeInOut',
            duration: 16000,
            repeat: -1,
            yoyo: true
        });
        this.hueTween.play();
        this.valueTween = this.add.tween({
            targets: this,
            hsvValue: 0.5,
            ease: 'Quad.easeIn',
            duration: 3000
        });
        this.valueTween.play();

        // start game button
        this.startGameBind = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.startGameBind.on("down", () => {this.startGame();});

        // create rotating triangles
        this.numTriangles = 4;
        this.triangleScale = 3500;
        this.triangleGraphics = this.add.graphics();
        this.children.bringToTop(this.triangleGraphics);
        this.triangleGraphics.lineStyle(20, 0xffffff, 0.5);
        this.triangles = {};
        this.triangleOffset = Math.sqrt(Math.pow(this.triangleScale, 2) * 1.25);
        for (let i = 0; i < this.numTriangles; i++) {
            this.triangles[i] = new Phaser.Geom.Triangle.BuildEquilateral(this.sys.scale.width / 2, this.sys.scale.height - this.triangleOffset / 2, this.triangleScale);
            Phaser.Geom.Triangle.Rotate(this.triangles[i], Math.PI * 2 / 3 / this.numTriangles * i * (Math.random() / 2 + 0.5));
            this.triangleGraphics.strokeTriangleShape(this.triangles[i]);
        }
        this.triangleSpeedMod = 15000;
        this.triangleSpeedTween = this.add.tween({
            targets: this,
            triangleSpeedMod: 7000,
            ease: 'Quad.easeInOut',
            duration: 5000,
            repeat: -1,
            yoyo: true
        });
        this.triangleSpeedTween.play();
    }

    update(time, delta) {
        this.backgroundGeom.width = this.title.displayWidth;
        this.backgroundGeom.height = this.title.displayHeight;
        this.backgroundGeom.x = this.title.x - this.title.displayWidth / 2;
        this.backgroundGeom.y = this.title.y - this.title.displayHeight / 2;
        this.background.clear();
        this.background.fillStyle(Phaser.Display.Color.HSVToRGB(this.hue, 0.9, this.hsvValue).color, 1);
        this.background.fillRectShape(this.backgroundGeom);
        
        this.triangleGraphics.clear();
        this.triangleGraphics.lineStyle((Math.sin(time / 8000 * 2 * Math.PI) + 1) * 15 + 5, 0x000000, 0.75);

        for (let i = 0; i < this.numTriangles; i++) {
            Phaser.Geom.Triangle.CenterOn(this.triangles[i], this.sys.scale.width / 2, this.sys.scale.height + this.triangleOffset / 6);
            Phaser.Geom.Triangle.Rotate(this.triangles[i], Math.PI / this.triangleSpeedMod * delta * (i / 3.0 + 1) * Math.sign(i % 2 - 0.5));
            this.triangleGraphics.strokeTriangleShape(this.triangles[i]);
        }
    }

    startGame() {
        this.endTween = this.add.tween({
            targets: this.title,
            displayWidth: '*=35',
            displayHeight: '*=35',
            y: '-=1000',
            duration: 600,
            ease: 'Expo.easeIn',
            onComplete: () => {this.scene.start("platformer");}
        });
        this.endTween.play();
    }
}