class Player extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, 
                controls,
                numTriangles, texture, frame) {
        super(scene, x, y, texture, frame);

        this.body = new Phaser.Physics.Arcade.Body(scene.physics.world, this);
        let collisionRadius = 25;
        this.body.setSize(collisionRadius * 2, collisionRadius * 2, this.displayWidth / 2 - collisionRadius, this.displayHeight / 2 - collisionRadius);
        this.body.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, scene.map.widthInPixels, scene.map.heightInPixels));
        
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

        this.controls = controls;
        this.startingJumpVelo = -460;
        this.jumpVelo = this.startingJumpVelo;
        this.maxJumpVelo = 1500;
        this.lastXVelo = this.body.maxVelocity.x + 1;

        this.controls.jump.on("up", () => {
            if (this.body.onFloor()) {
                console.log("jump at velo", this.jumpVelo * -1);
                this.body.setVelocityY(this.jumpVelo);
            }
            this.jumpVelo = this.startingJumpVelo;

            // set startvelo to inactive by making it > player's max speed
            this.lastXVelo = this.body.maxVelocity.x + 1;
        });

        this.acceleration = 500;
        this.body.setMaxVelocityX(1000);
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
            this.body.setDragX(this.drag * 3);
            this.rotation -= this.rotation * 0.03;
        }
        else {
            this.body.setAccelerationX(0);
            this.body.setDragX(this.drag);
            this.rotation -= this.rotation * 0.01;
        }

        if (this.controls.jump.isDown && this.body.onFloor()) {
            if (Math.abs(this.lastXVelo) < this.body.maxVelocity.x && Math.abs(this.jumpVelo) < this.maxJumpVelo) {
                console.log(Math.abs(this.lastXVelo - this.body.velocity.x) * -1);
                this.jumpVelo += Math.max(Math.abs(this.lastXVelo - this.body.velocity.x) * -1, -87.5);
            }
            this.lastXVelo = this.body.velocity.x;
            this.body.setAccelerationX(0);
            if (this.body.drag.x < this.drag) {
                this.body.setDragX(this.drag);
            }

            if (Math.abs(this.jumpVelo) > this.maxJumpVelo) {
                this.jumpVelo = this.maxJumpVelo * -1;
            }
        }
    }
}