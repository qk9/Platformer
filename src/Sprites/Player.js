class Player extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, 
                controls,
                numTriangles, texture, frame) {
        super(scene, x, y, texture, frame);

        // initialize physics body
        this.body = new Phaser.Physics.Arcade.Body(scene.physics.world, this);
        this.bodySize = 50;
        this.body.setSize(this.bodySize, this.bodySize, this.displayWidth / 2 - this.bodySize / 2, this.displayHeight / 2 - this.bodySize / 2);
        this.body.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, scene.map.widthInPixels, scene.map.heightInPixels));

        // create rotating triangles
        this.numTriangles = numTriangles;
        this.triangleScale = 200;
        this.triangleGraphics = scene.add.graphics();
        this.scene.children.sendToBack(this.triangleGraphics);
        this.triangleGraphics.lineStyle(10, 0xffffff, 1);
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
        this.storedVelo = 0;
        this.storedVeloBleed = 500;
        this.maxStoredVelo = 1500;
        this.lastXVelo = this.body.maxVelocity.x + 1;
        this.canStoreVelo = true;

        // jump callback & variables
        this.minJumpVelo = -300;
        this.controls.jump.on("down", this.jump, this);

        // dash callback & variables
        this.dashVelo = 0;
        this.moveDirection = 0; // -1 = left, 0 = neutral, 1 = right
        this.controls.dash.on("down", this.dash, this)

        this.scene.input.on("pointerup", () => {this.canStoreVelo = true;});

        this.scene.children.bringToTop(this);

        scene.physics.add.existing(this);
        this.collider = scene.physics.add.collider(this.body, scene.platforms);
        this.body.setCollideWorldBounds(true);
        
        scene.add.existing(this);
        return this;
    }


    update(time, delta) {
        this.triangleGraphics.clear();
        
        this.triangleGraphics.lineStyle((Math.sin(time / 1000 * 2 * Math.PI) + 1) * 9 + 2, 0xffffff, 0.75);
        for (let i = 0; i < this.numTriangles; i++) {
            Phaser.Geom.Triangle.CenterOn(this.triangles[i], this.x, this.y);
            Phaser.Geom.Triangle.Rotate(this.triangles[i], Math.PI * 2 / 3500 * delta * (i / 3.0 + 1) * (this.body.velocity.x / this.body.maxVelocity.x));
            this.triangleGraphics.strokeTriangleShape(this.triangles[i]);
        }

        this.handleControlInputs(delta);

        this.handleShortWallCollisions();

        //console.log(this.storedVelo);

        // cap downwards velo so you don't fall through the floor (thanks phaser)
        this.body.velocity.y = Math.min(this.body.velocity.y, this.maxFallVelo);

        this.lastXVelo = this.body.velocity.x;
    }

    handleShortWallCollisions() {
        if (this.body.blocked.left && this.body.position.x > 0) {
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

        if (this.body.blocked.right && this.body.position.x + this.bodySize < this.scene.map.widthInPixels) {
            //console.log("old y:" + this.body.position.y);
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
            this.body.setDragX(0);
            this.rotation += (Math.PI / -6 - this.rotation) * 0.01;
        }
        else if (this.controls.right.isDown && !this.controls.left.isDown) {
            this.inDirection = 1;
            this.body.setDragX(0);
            this.rotation += (Math.PI / 6 - this.rotation) * 0.01;
        }
        else {
            if (this.controls.left.isDown) {
                this.body.setDragX(this.drag);
                this.rotation -= this.rotation * 0.01;
            }
            else {
                this.body.setDragX(this.drag * 3);
                this.rotation -= this.rotation * 0.03;
            }
            this.inDirection = 0;
        }

        if (this.body.onFloor()) {
            this.moveDirection = this.inDirection;
            // handle velocity storage
            if (this.canStoreVelo && this.controls.storeVelo.isDown) {
                // start siphoning xVelo
                this.moveDirection = 0;
                this.body.setDragX(Math.max(this.body.drag.x, this.drag));

                // add siphoned xVelo to storage
                if (Math.abs(this.storedVelo) < this.maxStoredVelo) {
                    // if you hit a wall, you don't get to keep the velo from that
                    this.storedVelo += Math.min(Math.abs(this.lastXVelo - this.body.velocity.x), 87.5);
                }

                // cap stored velo
                this.storedVelo = Math.min(this.storedVelo, this.maxStoredVelo);
            }
            else {
                this.storedVelo = Math.max(this.storedVelo - (this.storedVeloBleed * (delta / 1000)), 0);
            }
        }
        
        // update player physics values
        let highAccelProportion = Math.min(Math.abs(this.body.velocity.x / this.body.maxVelocity.x), this.lowAccelCutoff) / this.lowAccelCutoff;
        this.body.setAccelerationX((highAccelProportion * this.highSpeedAccel + (1 - highAccelProportion) * this.lowSpeedAccel) * this.moveDirection)
    }

    jump() {
        if (this.body.onFloor() && this.canStoreVelo) {
            this.body.setVelocityY((this.storedVelo * -1) + this.minJumpVelo);
            this.body.setDragX(0);
            this.dashVelo = this.storedVelo;
        }
        this.storedVelo = 0;
        this.canStoreVelo = true;
    }

    dash() {
        console.log("inDirection:" + this.inDirection);
        this.body.setVelocityX(this.body.velocity.x + Math.max(this.storedVelo, this.dashVelo) * this.inDirection);
        console.log(this.body.velocity.x);
        if (this.storedVelo > 0) {
            this.canStoreVelo = false;
        }
        this.body.setDragX(0);
        this.storedVelo = 0;
        this.dashVelo = 0;
    }
}