class Player extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, 
                controls,
                slowRotorTexture,
                fastRotorTexture,
                numTriangles, frame) {
        super(scene, x, y, slowRotorTexture, frame);

        // initialize physics body
        this.body = new Phaser.Physics.Arcade.Body(scene.physics.world, this);
        this.bodySize = 60;
        this.body.setSize(this.bodySize, this.bodySize, this.displayWidth / 2 - this.bodySize / 2, this.displayHeight / 2 - this.bodySize / 2);
        this.body.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, scene.map.widthInPixels, scene.map.heightInPixels));

        this.textureSlow = slowRotorTexture;
        this.textureFast = fastRotorTexture;

        // create rotating strokes
        this.rotorInner = this.scene.add.sprite(this.x, this.y, slowRotorTexture);
        this.rotorInner.flipX = true;
        this.rotorInner.setScale(0.4, 0.4);

        // create player color graphics
        this.outerGraphics = scene.add.graphics();
        this.innerGraphics = scene.add.graphics();
        this.outerColorGeom = new Phaser.Geom.Circle(this.x + this.displayWidth / 2, this.y + this.displayHeight / 2, this.displayWidth / 2 - 2);
        this.innerColorGeom = new Phaser.Geom.Circle(this.rotorInner.x + this.rotorInner.displayWidth / 2, this.rotorInner.y + this.rotorInner.displayHeight / 2, this.rotorInner.displayWidth / 2 - 2);
        this.outerGraphics.fillStyle(0xff0000, 1);
        this.innerGraphics.fillStyle(0x00ff00, 1);
        this.outerGraphics.fillCircleShape(this.outerColorGeom);
        this.innerGraphics.fillCircleShape(this.innerColorGeom);
        scene.children.bringToTop(this);
        scene.children.bringToTop(this.innerGraphics);
        scene.children.bringToTop(this.rotorInner);

        this.outerParticleGeom = new Phaser.Geom.Circle(0, 0, this.outerColorGeom.radius);

        this.particleGraphics = scene.add.graphics();
        this.generateParticleSprite();

        // create particle emitters
        this.suckEmitter = this.scene.add.particles(0, 0, 'particle',
            {
                x: {
                    onUpdate: (particle, key, t, value) => {
                        particle.toPos.x = particle.toPos.x * (0.99 - t * 0.04) + this.body.position.x * (0.01 + t * 0.04);
                        return particle.toPos.x + this.bodySize / 2 + (this.outerColorGeom.radius + 100) * Math.cos(particle.inAngle + (Math.PI * 1.5 * Math.pow(t, 2) * Math.sign(!this.flipX - 0.5))) * (Math.sin(t * 9 * Math.PI / 10 + Math.PI / 10));
                    }
                },
                y: {
                    onUpdate: (particle, key, t, value) => {
                        particle.toPos.y = particle.toPos.y * (0.99 - t * 0.04) + this.body.position.y * (0.01 + t * 0.04);
                        return particle.toPos.y + this.bodySize / 2 + (this.outerColorGeom.radius + 100) * Math.sin(particle.inAngle + (Math.PI * 1.5 * Math.pow(t, 2) * Math.sign(!this.flipX - 0.5))) * (Math.sin(t * 9 * Math.PI / 10 + Math.PI / 10));
                    }
                },
                scale: 0.25,
                alpha: {start: 0.25, end: 0.75},
                frequency: 10,
                quantity: 0,
                blendMode: 'ADD',
                emitCallback: (particle) => {

                    let angle = Math.random() * Math.PI * 2;
                    particle.inAngle = angle;
                    particle.toPos = {x: this.body.position.x, y: this.body.position.y};

                    particle.x = this.outerColorGeom.x + (this.outerColorGeom.radius + 100) * (Math.cos(angle));
                    particle.y = this.outerColorGeom.y + (this.outerColorGeom.radius + 100) * (Math.sin(angle));

                    particle.life = Math.max(Math.abs(this.body.velocity.x * 0.8), 100);
                    particle.lifeCurrent = particle.life;

                    this.scene.children.bringToTop(particle);
                },
                deathZone: {
                    type: 'onEnter',
                    source: this.outerColorGeom
                }
            }
        );
        this.suckEmitter.startFollow(this.body, this.outerParticleGeom.radius, this.outerParticleGeom.radius);

        this.boostEmitter = this.scene.add.particles(0, 0, 'particle',
            {
                scale: 0.25,
                alpha: {start: 1, end: 0},
                quantity: 0,
                blendMode: 'ADD',
                emitCallback: (particle) => {
                    particle.x = this.outerColorGeom.x + (Math.random() * 15 + (this.outerColorGeom.radius - 10) * this.inDirection * -1) * (this.boostEmitter.inSource == "dash");
                    particle.y = this.outerColorGeom.y + (Math.random() * 15 + (this.outerColorGeom.radius - 10)) * (this.boostEmitter.inSource == "jump");

                    particle.velocityX = Math.max(this.scene.player.storedVelo + 200, this.scene.player.comboVelo + 200) * Math.pow(Math.random() + 0.2, 3) * this.boostEmitter.currSign * (this.boostEmitter.inSource == "jump");
                    particle.velocityY = Math.max(this.scene.player.storedVelo + 200, this.scene.player.comboVelo + 200) * Math.pow(Math.random() + 0.2, 3) * this.boostEmitter.currSign * (this.boostEmitter.inSource == "dash");

                    particle.accelerationX = -1 * particle.velocityX * (this.boostEmitter.inSource == "jump");
                    particle.accelerationY = -1 * particle.velocityY * (this.boostEmitter.inSource == "dash");

                    this.boostEmitter.currSign *= -1;

                    particle.life = Math.max(1000 - Math.max(Math.abs(particle.velocityX), Math.abs(particle.velocityY)), 150);
                    particle.lifeCurrent = particle.life;
                }

            }
        );
        this.boostEmitter.currSign = 1;


        // create rotating triangles
        this.numTriangles = numTriangles;
        this.triangleScale = 200;
        this.triangleGraphics = scene.add.graphics();
        this.scene.children.sendToBack(this.triangleGraphics);
        this.triangleGraphics.lineStyle(10, 0x000000, 1);
        this.triangles = {};
        let triangleOffset = Math.sqrt(Math.pow(this.triangleScale, 2) * 1.25);
        for (let i = 0; i < numTriangles; i++) {
            this.triangles[i] = new Phaser.Geom.Triangle.BuildEquilateral(this.x + triangleOffset, this.y + triangleOffset, this.triangleScale);
            Phaser.Geom.Triangle.Rotate(this.triangles[i], Math.PI * 2 / 3 / numTriangles * i);
            this.triangleGraphics.strokeTriangleShape(this.triangles[i]);
        }

        // initialize player controls
        this.controls = controls;

        // player movement constants
        this.body.setMaxVelocityX(1500);
        this.body.setMaxVelocityY(1425);
        this.maxFallVelo = 900; // prevent player from glitching through walls (thanks phaser)
        this.shortWallHitMultiplier = 2 / 3;
        this.lowSpeedAccel = this.body.maxVelocity.x * 0.8;
        this.lowAccelCutoff = 0.6;
        this.highSpeedAccel = this.body.maxVelocity.x * 0.15;
        this.drag = 700;
        this.dragMultiplier = 1;

        // momentum storage variables
        this.veloToStore = 0;
        this.storedVelo = 0;
        this.comboVelo = 0;
        this.comboSource = "";
        this.storedVeloBleed = 500;
        this.maxStoredVelo = 1500;
        this.lastXVelo = this.body.maxVelocity.x + 1;
        this.canStoreVelo = true;

        // jump callback & variables
        this.minJumpVelo = -300;
        this.controls.jump.on("down", this.jump, this);

        // dash callback & variables
        this.inDirection = 0;
        this.moveDirection = 0; // -1 = left, 0 = neutral, 1 = right
        this.controls.dash.on("down", this.dash, this)

        // momentum storage resetting
        this.scene.input.on("pointerup", () => {this.canStoreVelo = true;});

        this.scene.children.bringToTop(this);

        // level end condition tracker
        this.coinsToCollect = 0;//scene.foreground.filterTiles().length;

        // initialize player body with scene's physics
        scene.physics.add.existing(this);
        this.collider = scene.physics.add.collider(this.body, scene.platforms);
        //TODO: change this to interact with a new "coins" layer in the tilemap
        this.collector = scene.physics.add.overlap(this.body, scene.foreground, (object1, object2) => {
            if (object2.index != -1) {
                this.scene.foreground.removeTileAt(object2.x, object2.y);
                this.scene.background.putTileAt(1, object2.x, object2.y, false, scene.background);
                this.coinsCollected++;
                if (this.scene.foreground.findByIndex(object2.index, 0, false, object2.layer) == null) {
                    this.scene.triggerGameOver();
                }
            }
        });
        this.body.setCollideWorldBounds(true);
        
        scene.add.existing(this);
        return this;
    }


    update(time, delta) {
        this.generateParticleSprite();

        this.handleControlInputs(delta);

        this.handleShortWallCollisions();

        this.handleVisuals(time, delta);

        // cap downwards velo so you don't fall through the floor (thanks phaser)
        this.body.velocity.y = Math.min(this.body.velocity.y, this.maxFallVelo);

        this.lastXVelo = this.body.velocity.x;
    }

    generateParticleSprite() {
        let color = Phaser.Display.Color.HSVToRGB(1 / 3 * (1 - Math.abs(this.body.velocity.x / this.body.maxVelocity.x)), 1, 1).color;
        this.particleGraphics.fillStyle(color, 1);
        this.particleGraphics.fillCircle(8, 8, 8);
        this.particleGraphics.generateTexture('particle', 16, 16);
        this.particleGraphics.clear();
    }

    handleVisuals(time, delta) {
        if (Math.abs(this.body.velocity.x) > this.body.maxVelocity.x * 0.75 && this.texture.key != this.textureFast.key) {
            this.setTexture(this.textureFast);
        }
        else if (this.texture.key != this.textureSlow.key) {
            this.setTexture(this.textureSlow);
        }

        if (this.storedVelo > this.maxStoredVelo * 0.75 && this.rotorInner.texture.key != this.textureFast.key) {
            this.rotorInner.setTexture(this.textureFast);
        }
        else if (this.rotorInner.texture.key != this.textureSlow.key) {
            this.rotorInner.setTexture(this.textureSlow);
        }

        if (this.body.velocity.x > 0 && !this.flipX) {
            this.flipX = true;
            this.rotorInner.flipX = false;
            this.rotation -= Math.PI / 6;
            this.rotorInner.rotation += Math.PI / 6;
        }
        else if (this.body.velocity.x < 0 && this.flipX) {
            this.flipX = false;
            this.rotorInner.flipX = true;
            this.rotation += Math.PI / 6;
            this.rotorInner.rotation -= Math.PI  / 6;
        }

        let dR = (delta / 1000) / this.bodySize;
        this.rotation += this.body.velocity.x * dR;
        this.rotorInner.rotation -= Math.max(this.storedVelo, this.comboVelo) * dR * 2 * Math.sign(this.rotorInner.flipX - 0.5) * -1;
        this.outerColorGeom.setPosition(this.body.x + this.bodySize / 2, this.body.y + this.bodySize / 2);

        this.rotorInner.setPosition(this.body.x + this.bodySize / 2, this.body.y + this.bodySize / 2);
        this.innerColorGeom.setPosition(this.rotorInner.x, this.rotorInner.y);
        this.scene.children.bringToTop(this.innerGraphics);
        this.scene.children.bringToTop(this.rotorInner);

        this.outerGraphics.clear();
        this.innerGraphics.clear();
        this.outerGraphics.fillStyle(Phaser.Display.Color.HSVToRGB(1 / 3 * (1 - Math.abs(this.body.velocity.x / this.body.maxVelocity.x)), 1, 1).color, 1);
        this.innerGraphics.fillStyle(Phaser.Display.Color.HSVToRGB(60 / 360 * (this.storedVelo > this.comboVelo), 1, Math.max(this.storedVelo, this.comboVelo) / this.maxStoredVelo).color, 1);

        this.outerGraphics.fillCircleShape(this.outerColorGeom);
        this.innerGraphics.fillCircleShape(this.innerColorGeom);
        
        this.triangleGraphics.clear();
        this.triangleGraphics.lineStyle((Math.sin(time / 3000 * 2 * Math.PI) + 1) * 6 + 3, 0x000000, 0.75);

        for (let i = 0; i < this.numTriangles; i++) {
            Phaser.Geom.Triangle.CenterOn(this.triangles[i], this.body.x + this.bodySize / 2, this.body.y + this.bodySize / 2);
            Phaser.Geom.Triangle.Rotate(this.triangles[i], Math.PI * 2 / 2000 * delta * (i / 3.0 + 1) * (this.body.velocity.x / this.body.maxVelocity.x));
            this.triangleGraphics.strokeTriangleShape(this.triangles[i]);
        }
    }

    handleShortWallCollisions() {
        if (this.body.blocked.left && this.body.position.x > (this.scene.map.tileWidth / 2)) {
            //console.log("old y:" + this.body.position.y);
            // step upwards if top of wall is <= 1 tile away
            if (this.scene.map.getTileAt(Math.floor(this.x / this.scene.map.tileWidth) - 1, Math.floor(this.y / this.scene.map.tileWidth) - 1, true, "physical").index == -1) {
                //console.log("step up-left");

                // update x velocity
                let veloMultiplier = 1 - ((1 - this.shortWallHitMultiplier) * Math.abs(this.body.position.y - (Math.floor((this.body.position.y + this.bodySize - 1) / this.scene.map.tileHeight) * this.scene.map.tileHeight - this.bodySize)) / this.scene.map.tileHeight);
                this.body.setVelocityX(this.lastXVelo * veloMultiplier);

                // update y position
                this.body.setDirectControl();
                this.body.position.y = Math.floor((this.body.position.y + this.bodySize - 1) / this.scene.map.tileHeight) * this.scene.map.tileHeight - this.bodySize;
                //console.log(this.body.position.y);
                if(this.lastXVelo < 50) {
                    this.body.position.x -= 2;
                }
                if (this.body.velocity.y > 0) {
                    this.body.velocity.y = 0;
                }
                this.body.setDirectControl(false);

                // update physics value due to fixed physics timestep issues
                this.body.blocked.left = false;
            }

            // step downwards if bottom of wall is <= 1 tile away
            else if (this.scene.map.getTileAt(Math.floor(this.x / this.scene.map.tileWidth) - 1, Math.floor(this.y / this.scene.map.tileWidth) + 1, true, "physical").index == -1) {
                //console.log("step down-left");

                // update x velocity
                let veloMultiplier = 1 - ((1 - this.shortWallHitMultiplier) * Math.abs(this.body.position.y - (Math.ceil((this.body.position.y + 1) / this.scene.map.tileHeight) * (this.scene.map.tileHeight + 1))) / this.scene.map.tileHeight);
                this.body.setVelocityX(this.lastXVelo * veloMultiplier);

                // update y position
                this.body.setDirectControl();
                this.body.position.y = Math.ceil((this.body.position.y + 1) / this.scene.map.tileHeight) * (this.scene.map.tileHeight + 1);
                //console.log(this.body.position.y);
                if (this.body.velocity.y < 0) {
                    this.body.velocity.y = 0;
                }
                this.body.setDirectControl(false);

                // update physics value due to fixed physics timestep issues
                this.body.blocked.left = false;
            }
        }

        if (this.body.blocked.right && this.body.position.x + this.bodySize < this.scene.map.widthInPixels - (this.scene.map.tileWidth / 2)) {
            // step upwards if top of wall is <= 1 tile away
            if (this.scene.map.getTileAt(Math.floor(this.x / this.scene.map.tileWidth) + 1, Math.floor(this.y / this.scene.map.tileWidth) - 1, true, "physical").index == -1) {
                //console.log("step up-right");

                // update x velocity
                let veloMultiplier = 1 - ((1 - this.shortWallHitMultiplier) * Math.abs(this.body.position.y - (Math.floor((this.body.position.y + this.bodySize - 1) / this.scene.map.tileHeight) * this.scene.map.tileHeight - this.bodySize)) / this.scene.map.tileHeight);
                this.body.setVelocityX(this.lastXVelo * veloMultiplier);

                // update y position
                this.body.setDirectControl();
                this.body.position.y = Math.floor((this.body.position.y + this.bodySize - 1) / this.scene.map.tileHeight) * this.scene.map.tileHeight - this.bodySize;
                //console.log(this.body.position.y);
                if(this.lastXVelo < 50) {
                    this.body.position.x += 2;
                }
                if (this.body.velocity.y > 0) {
                    this.body.velocity.y = 0;
                }
                this.body.setDirectControl(false);

                // update physics value due to fixed physics timestep issues
                this.body.blocked.right = false;
            }
            // step downwards if top of wall is <= 1 tile away
            else if (this.scene.map.getTileAt(Math.floor(this.x / this.scene.map.tileWidth) + 1, Math.floor(this.y / this.scene.map.tileWidth) + 1, true, "physical").index == -1) {
                //console.log("step down-right");

                // update x velocity
                let veloMultiplier = 1 - ((1 - this.shortWallHitMultiplier) * Math.abs(this.body.position.y - (Math.ceil((this.body.position.y + 1) / this.scene.map.tileHeight) * (this.scene.map.tileHeight + 1))) / this.scene.map.tileHeight);
                this.body.setVelocityX(this.lastXVelo * veloMultiplier);

                // update y position
                this.body.setDirectControl();
                this.body.position.y = Math.ceil((this.body.position.y + 1) / this.scene.map.tileHeight) * (this.scene.map.tileHeight + 1);
                //console.log(this.body.position.y);
                if (this.body.velocity.y < 0) {
                    this.body.velocity.y = 0;
                }
                this.body.setDirectControl(false);

                // update physics value due to fixed physics timestep issues
                this.body.blocked.right = false;
            }
        }
    }

    handleControlInputs(delta) {
        // determine movement direction, set drag, and animate player model
        if (this.controls.left.isDown && !this.controls.right.isDown) {
            this.inDirection = -1;
            if (this.body.velocity.x > 0) {
                this.inDirection = 0;
                this.body.setDragX(this.drag * 3);
            }
            else {
                this.body.setDragX(0);
            }
        }
        else if (this.controls.right.isDown && !this.controls.left.isDown) {
            this.inDirection = 1;
            if (this.body.velocity.x < 0) {
                this.inDirection = 0;
                this.body.setDragX(this.drag * 3);
            }
            else {
                this.body.setDragX(0);
            }
        }
        else {
            if (this.controls.left.isDown) {
                this.body.setDragX(this.drag);
            }
            else {
                this.body.setDragX(this.drag * 3);
            }
            this.inDirection = 0;
        }
        if (this.body.onFloor()) {
            this.moveDirection = this.inDirection;
        }
        
        // handle velocity storage
        if (this.canStoreVelo && this.controls.storeVelo.isDown) {
            this.comboVelo = 0;

            // start siphoning xVelo
            this.moveDirection = 0;
            this.body.setDragX(Math.max(this.body.drag.x, this.drag));

            // add siphoned xVelo to storage
            if (Math.abs(this.storedVelo) < this.maxStoredVelo && Math.abs(this.body.velocity.x) > 0) {
                this.suckEmitter.quantity = 1;
                // if you hit a wall, you don't get to keep the velo from that
                this.storedVelo += Math.min(Math.abs(this.lastXVelo - this.body.velocity.x), 87.5);
                // veloToStore is sent to the player via the suckEmitter
            }
            else {
                this.suckEmitter.quantity = 0;
            }

            // cap stored velo
            this.storedVelo = Math.min(this.storedVelo, this.maxStoredVelo);
        }
        else {
            this.storedVelo = Math.max(this.storedVelo - (this.storedVeloBleed * (delta / 1000)), 0);
            this.suckEmitter.quantity = 0;
        }

        if (this.comboVelo > 0) {
            this.comboVelo = Math.max(this.comboVelo - (this.storedVeloBleed * (delta / 1000)), 0)
        }
        else {
            this.comboSource = "";
        }

        if (this.body.onFloor() && this.comboVelo == 0 && !this.canStoreVelo) {
            this.canStoreVelo = true;
        }
        
        // update player physics values
        let highAccelProportion = Math.min(Math.abs(this.body.velocity.x / this.body.maxVelocity.x), this.lowAccelCutoff) / this.lowAccelCutoff;
        this.body.setAccelerationX((highAccelProportion * this.highSpeedAccel + (1 - highAccelProportion) * this.lowSpeedAccel) * this.moveDirection)
    }

    jump() {
        if (this.comboSource == "jump" || !this.body.onFloor()) return;

        this.boostEmitter.quantity = Math.floor(Math.max(this.scene.player.storedVelo, this.scene.player.comboVelo) / 20) + (10 * (Math.max(this.scene.player.storedVelo, this.scene.player.comboVelo) > 0));
        this.boostEmitter.inSource = "jump";
        this.boostEmitter.explode();
        this.boostEmitter.inSource = "";
        this.boostEmitter.quantity = 0;

        this.body.setVelocityY((Math.max(this.storedVelo, this.comboVelo) * -1) + this.minJumpVelo);
        this.body.setDragX(0);

        this.comboVelo = this.storedVelo * 2 / 3;
        if (this.comboVelo > 0) {
            this.comboSource = "jump";
        }
        else {
            this.comboSource = "";
        }
        if (this.storedVelo > 0) {
            this.canStoreVelo = false;
        }
        this.storedVelo = 0;

        // prevent combo velo from being reset due to async physics framerate
        this.body.blocked.down = false;
    }

    dash() {
        if (this.comboSource == "dash" || this.inDirection == 0) return;

        this.boostEmitter.quantity = Math.floor(Math.max(this.scene.player.storedVelo, this.scene.player.comboVelo) / 20) + (10 * (Math.max(this.scene.player.storedVelo, this.scene.player.comboVelo) > 0));
        this.boostEmitter.inSource = "dash";
        this.boostEmitter.explode();
        this.boostEmitter.inSource = "";
        this.boostEmitter.quantity = 0;

        this.body.setVelocityX(this.body.velocity.x + Math.max(this.storedVelo, this.comboVelo) * this.inDirection);
        this.moveDirection = this.inDirection;
        this.comboVelo = this.storedVelo * 2 / 3;

        if (this.comboVelo > 0) {
            this.comboSource = "dash";
        }
        else {
            this.comboSource = "";
        }

        if (this.body.onFloor() && this.controls.storeVelo.isDown) {
            this.canStoreVelo = false;
        }
        else {
            this.canStoreVelo = true;
        }

        this.body.setDragX(0);
        this.storedVelo = 0;
    }

    deleteSubObjects() {
        this.body.destroy();
        this.outerGraphics.destroy();
        this.rotorInner.destroy();
        this.innerGraphics.destroy();
        this.suckEmitter.destroy();
        this.boostEmitter.destroy();
        this.triangleGraphics.destroy();
    }
}