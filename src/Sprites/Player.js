class Player extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, 
                controls,
                numTriangles, texture, frame) {
        super(scene, x, y, texture, frame);

        // initialize physics body
        this.body = new Phaser.Physics.Arcade.Body(scene.physics.world, this);
        let collisionRadius = 25;
        this.body.setSize(collisionRadius * 2, collisionRadius * 2, this.displayWidth / 2 - collisionRadius, this.displayHeight / 2 - collisionRadius);
        this.body.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, scene.map.widthInPixels, scene.map.heightInPixels));

        // create rotating triangles
        this.numTriangles = numTriangles;
        this.triangleScale = 200;
        this.triangleGraphics = this.scene.add.graphics();
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
        this.maxFallVelo = 900; // prevent player from glitching through walls (thanks phaser)
        this.dragMultiplier = 1;

        // momentum storage variables
        this.storedVelo = 0;
        this.maxStoredVelo = 1500;
        this.lastXVelo = this.body.maxVelocity.x + 1;
        this.canStoreVelo = true;

        // jump callback & variables
        this.minJumpVelo = -460;
        this.controls.jump.on("up", () => {
            if (this.body.onFloor() && this.canStoreVelo) {
                console.log("jump at velo", this.storedVelo);
                this.body.setVelocityY((this.storedVelo * -1) + this.minJumpVelo);
            }
            this.storedVelo = 0;
            this.canStoreVelo = true;

            // flag lastXVelo as invalid by making it > player's max speed
            this.lastXVelo = this.body.maxVelocity.x + 1;
        });

        // dash callback & variables
        this.dashVelo = 0;
        this.moveDirection = 0; // -1 = left, 0 = neutral, 1 = right
        this.controls.dash.on("down", () => {
            this.body.setVelocityX(this.body.velocity.x + this.storedVelo * this.moveDirection);

            if (this.storedVelo > 0) {
                this.canStoreVelo = false;
            }
            // remove spent dashVelo from storedVelo; use += because storedVelo is negative
            this.storedVelo = 0;
        })

        this.acceleration = 500;
        this.body.setMaxVelocityX(1000);
        this.body.setMaxVelocityY(1425);
        this.drag = 700;
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

        /*// left/right movement
        if (this.body.onFloor()) {
            if (this.controls.left.isDown && !this.controls.right.isDown) {
                this.body.setAccelerationX(this.acceleration * -1);
                this.body.setDragX(0);
                this.rotation += (Math.PI / -6 - this.rotation) * 0.01;
            }
            else if (this.controls.right.isDown && !this.controls.left.isDown) {
                this.body.setAccelerationX(this.acceleration);
                this.body.setDragX(0);
                this.rotation += (Math.PI / 6 - this.rotation) * 0.01;
            }
            else if (this.controls.left.isDown && this.controls.right.isDown) {
                this.body.setAccelerationX(0);
                this.body.setDragX(this.drag);
                this.rotation -= this.rotation * 0.03;
            }
            else {
                this.body.setAccelerationX(0);
                this.body.setDragX(this.drag * 3);
                this.rotation -= this.rotation * 0.01;
            }
        }

        if (this.controls.jump.isDown && this.body.onFloor()) {
            // reset dash velo
            this.dashVelo = 0;

            // kill acceleration and update drag if needed
            this.body.setAccelerationX(0);
            if (this.body.drag.x < this.drag) {
                this.body.setDragX(this.drag);
            }

            // add siphoned xVelo to jump height
            if (Math.abs(this.lastXVelo) < this.body.maxVelocity.x && Math.abs(this.storedVelo) < this.maxStoredVelo) {
                console.log(Math.abs(this.lastXVelo - this.body.velocity.x) * -1);
                this.storedVelo += Math.max(Math.abs(this.lastXVelo - this.body.velocity.x) * -1, -87.5);
            }
            this.lastXVelo = this.body.velocity.x;

            // cap jump velo
            if (Math.abs(this.storedVelo) > this.maxStoredVelo) {
                this.storedVelo = this.maxStoredVelo * -1;
            }
        }*/
        this.handleControlInputs();

        // cap downwards velo so you don't fall through the floor (thanks phaser)
        this.body.velocity.y = Math.min(this.body.velocity.y, this.maxFallVelo);
        console.log(this.storedVelo);
    }

    handleControlInputs() {
        // left/right movement
        if (this.body.onFloor()) {
            // determine movement direction, set drag, and animate player model
            if (this.controls.left.isDown && !this.controls.right.isDown) {
                this.moveDirection = -1;
                this.body.setDragX(0);
                this.rotation += (Math.PI / -6 - this.rotation) * 0.01;
            }
            else if (this.controls.right.isDown && !this.controls.left.isDown) {
                this.moveDirection = 1;
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
                this.moveDirection = 0;
            }

            // update player physics values
            this.body.setAccelerationX(this.acceleration * this.moveDirection);

            // handle velocity storage
            if (this.canStoreVelo && this.controls.jump.isDown) {
                // kill acceleration and update drag if needed
                this.body.setAccelerationX(0);
                if (this.body.drag.x < this.drag) {
                    this.body.setDragX(this.drag);
                }

                // add siphoned xVelo to storage
                if (Math.abs(this.lastXVelo) < this.body.maxVelocity.x && Math.abs(this.storedVelo) < this.maxStoredVelo) {
                    // if you hit a wall, you don't get to keep the velo from that
                    this.storedVelo += Math.min(Math.abs(this.lastXVelo - this.body.velocity.x), 87.5);
                }
                this.lastXVelo = this.body.velocity.x;

                // cap stored velo
                this.storedVelo = Math.min(this.storedVelo, this.maxStoredVelo);
            }
        }
    }
}