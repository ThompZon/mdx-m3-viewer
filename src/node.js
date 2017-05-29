/**
 * @class
 * @classdesc A scene node, that can be moved around and parented to other nodes.
 * @param {?ArrayBuffer} buffer An ArrayBuffer object to add this node to. A new buffer will be created if one isn't given.
 * @param {?number} offset An offset into the buffer, if one was given.
 */
function ViewerNode(buffer, offset) {
    if (!buffer) {
        // 65 floats per node.
        buffer = new ArrayBuffer(ViewerNode.BYTES_PER_ELEMENT);
        offset = 0;
    }

    if (!(buffer instanceof ArrayBuffer)) {
        throw new TypeError("Node: expected ArrayBuffer, got " + buffer);
    }

    /** @member {vec3} */
    this.pivot = new Float32Array(buffer, offset + 0, 3);
    /** @member {vec3} */
    this.localLocation = new Float32Array(buffer, offset + 12, 3);
    /** @member {quat} */
    this.localRotation = new Float32Array(buffer, offset + 24, 4);
    /** @member {vec3} */
    this.localScale = new Float32Array(buffer, offset + 40, 3);
    /** @member {vec3} */
    this.worldLocation = new Float32Array(buffer, offset + 52, 3);
    /** @member {quat} */
    this.worldRotation = new Float32Array(buffer, offset + 64, 4);
    /** @member {vec3} */
    this.worldScale = new Float32Array(buffer, offset + 80, 3);
    /** @member {vec3} */
    this.inverseWorldLocation = new Float32Array(buffer, offset + 92, 3);
    /** @member {vec4} */
    this.inverseWorldRotation = new Float32Array(buffer, offset + 104, 4);
    /** @member {vec3} */
    this.inverseWorldScale = new Float32Array(buffer, offset + 120, 3);
    /** @member {mat4} */
    this.localMatrix = new Float32Array(buffer, offset + 132, 16);
    /** @member {mat4} */
    this.worldMatrix = new Float32Array(buffer, offset + 196, 16);
    /** @member {?Node} */
    this.parent = null;
    /** @member {Node[]} */
    this.children = [];
    /** @member {boolean} */
    this.dontInheritTranslation = false;
    /** @member {boolean} */
    this.dontInheritRotation = false;
    /** @member {boolean} */
    this.dontInheritScaling = false;

    this.localRotation[3] = 1;
    this.localScale.fill(1);

    this.recalculateTransformation();
}

// Used in the constructor above, and in the Skeleton constructor.
// Chances are I'll forget updating one of them when I change stuff, so do it in one place.
ViewerNode.BYTES_PER_ELEMENT = 65 * 4;

ViewerNode.prototype = {
    /**
     * @method
     * @desc Sets the node's pivot.
     * @param {vec3} pivot The new pivot.
     * @returns this
     */
    setPivot(pivot) {
        vec3.copy(this.pivot, pivot);

        this.recalculateTransformation();

        return this;
    },

    /**
     * @method
     * @desc Sets the node's local location.
     * @param {vec3} location The new location.
     * @returns this
     */
    setLocation(location) {
        vec3.copy(this.localLocation, location);

        this.recalculateTransformation();

        return this;
    },

    /**
     * @method
     * @desc Sets the node's local rotation.
     * @param {quat} rotation The new rotation.
     * @returns this
     */
    setRotation(rotation) {
        quat.copy(this.localRotation, rotation);

        this.recalculateTransformation();

        return this;
    },

    /**
     * @method
     * @desc Sets the node's local scale.
     * @param {vec3} varying The new scale.
     * @returns this
     */
    setScale(varying) {
        vec3.copy(this.localScale, varying);

        this.recalculateTransformation();

        return this;
    },

    /**
     * @method
     * @desc Sets the node's local scale uniformly.
     * @param {number} uniform The new scale.
     * @returns this
     */
    setUniformScale(uniform) {
        vec3.set(this.localScale, uniform, uniform, uniform);

        this.recalculateTransformation();

        return this;
    },

    /**
     * @method
     * @desc Sets the node's local location, rotation, and scale.
     * @param {vec3} location The new location.
     * @param {quat} rotation The new rotation.
     * @param {vec3} scale The new scale.
     * @returns this
     */
    setTransformation(location, rotation, scale) {
        /*
        let localLocation = this.localLocation,
            localRotation = this.localRotation,
            localScale = this.localScale;

        localLocation[0] = location[0];
        localLocation[1] = location[1];
        localLocation[2] = location[2];

        localRotation[0] = rotation[0];
        localRotation[1] = rotation[1];
        localRotation[2] = rotation[2];
        localRotation[3] = rotation[3];

        localScale[0] = scale[0];
        localScale[1] = scale[1];
        localScale[2] = scale[2];
        */
        //*
        vec3.copy(this.localLocation, location);
        quat.copy(this.localRotation, rotation);
        vec3.copy(this.localScale, scale);
        //*/

        this.recalculateTransformation();

        return this;
    },

    /**
     * @method
     * @desc Resets the node's local location, pivot, rotation, and scale, to the default values.
     * @returns this
     */
    resetTransformation() {
        vec3.copy(this.pivot, vec3.ZERO);
        vec3.copy(this.localLocation, vec3.ZERO);
        quat.copy(this.localRotation, quat.DEFAULT);
        vec3.copy(this.localScale, vec3.ONE);

        this.recalculateTransformation();

        return this;
    },

    /**
     * @method
     * @desc Moves the node's pivot.
     * @param {vec3} offset The offset.
     * @returns this
     */
    movePivot(offset) {
        vec3.add(this.pivot, this.pivot, offset);

        this.recalculateTransformation();

        return this;
    },

    /**
     * @method
     * @desc Moves the node's local location.
     * @param {vec3} offset The offset.
     * @returns this
     */
    move(offset) {
        vec3.add(this.localLocation, this.localLocation, offset);

        this.recalculateTransformation();

        return this;
    },

    /**
     * @method
     * @desc Rotates the node's local rotation in world space.
     * @param {vec3} rotation The rotation.
     * @returns this
     */
    rotate(rotation) {
        quat.mul(this.localRotation, this.localRotation, rotation);

        this.recalculateTransformation();

        return this;
    },

    /**
     * @method
     * @desc Rotates the node's local rotation in local space.
     * @param {vec3} rotation The rotation.
     * @returns this
     */
    rotateLocal(rotation) {
        quat.mul(this.localRotation, rotation, this.localRotation);

        this.recalculateTransformation();

        return this;
    },

    /**
     * @method
     * @desc Scales the node.
     * @param {vec3} scale The scale.
     * @returns this
     */
    scale(scale) {
        vec3.mul(this.localScale, this.localScale, scale);

        this.recalculateTransformation();

        return this;
    },

    /**
     * @method
     * @desc Scales the node uniformly.
     * @param {number} scale The scale.
     * @returns this
     */
    uniformScale(scale) {
        vec3.scale(this.localScale, this.localScale, scale);

        this.recalculateTransformation();

        return this;
    },

    lookAt(target) {
        let l = [
            -this.worldLocation[0],
            -this.worldLocation[1],
            -this.worldLocation[2]
        ];

        let t = [
            -target[0],
            -target[1],
            -target[2]
        ];

        let rotation = mat4.getRotation(this.localRotation, mat4.lookAt(mat4.heap, l, t, vec3.UNIT_Y));

        quat.normalize(rotation, rotation)
        //quat.invert(rotation, rotation);

        this.recalculateTransformation();

        return this;
    },

    /**
     * @method
     * @desc Sets the node's parent.
     * @param {?Node} parent The parent. NOTE: don't set parent to null manually, instead use setParent(null).
     * @returns this
     */
    setParent(parent) {
        if (this.parent) {
            this.parent.removeChild(this);
        }

        this.parent = parent;

        if (parent) {
            parent.addChild(this);
        }

        this.recalculateTransformation();

        return this;
    },

    /**
     * @method
     * @desc Called by this node's parent, when the parent is recalculated.
     *       Override this if you want special behavior.
     *       Note that ModelInstance overrides this.
     */
    notify() {

    },

    /**
     * @method
     * @desc Recalculate this node's transformation data.
     */
    recalculateTransformation() {
        let localMatrix = this.localMatrix,
            localRotation = this.localRotation,
            worldMatrix = this.worldMatrix,
            worldLocation = this.worldLocation,
            worldRotation = this.worldRotation,
            worldScale = this.worldScale,
            pivot = this.pivot,
            inverseWorldLocation = this.inverseWorldLocation,
            inverseWorldRotation = this.inverseWorldRotation,
            inverseWorldScale = this.inverseWorldScale,
            parent = this.parent,
            children = this.children;

        // Local matrix
        // Model space
        mat4.fromRotationTranslationScaleOrigin(localMatrix, localRotation, this.localLocation, this.localScale, pivot);

        // World matrix
        // Model space -> World space
        if (parent) {
            mat4.mul(worldMatrix, parent.worldMatrix, localMatrix);

            // If this node shouldn't inherit the parent's rotation, rotate it by the inverse.
            if (this.dontInheritRotation) {
                mat4.rotate(worldMatrix, worldMatrix, parent.inverseWorldRotation);
            }

            // If this node shouldn't inherit the parent's scale, scale it by the inverse.
            if (this.dontInheritScaling) {
                mat4.scale(worldMatrix, worldMatrix, parent.inverseWorldScale);
            }

            // If this node shouldn't inherit the parent's translation, translate it by the inverse.
            if (this.dontInheritTranslation) {
                mat4.translate(worldMatrix, worldMatrix, parent.inverseWorldLocation);
            }

            /// TODO: what happens when dontInheritRotation is true?

            // World rotation and inverse world rotation
            quat.mul(worldRotation, parent.worldRotation, localRotation);
            quat.conjugate(inverseWorldRotation, worldRotation);
        } else {
            mat4.copy(worldMatrix, localMatrix);
            quat.copy(worldRotation, localRotation);
            quat.conjugate(inverseWorldRotation, localRotation);
        }

        // Scale and inverse scale
        mat4.getScaling(worldScale, worldMatrix);

        //inverseWorldScale[0] = -worldScale[0];
        //inverseWorldScale[1] = -worldScale[1];
        //inverseWorldScale[2] = -worldScale[2];
        vec3.inverse(this.inverseWorldScale, worldScale);

        /// TODO: what happens when dontInheritTranslation is true?

        // World location and inverse world location

        //worldLocation[0] = pivot[0];
        //worldLocation[1] = pivot[1];
        //worldLocation[2] = pivot[2];
        vec3.copy(worldLocation, pivot);

        vec3.transformMat4(worldLocation, worldLocation, worldMatrix);

        //inverseWorldLocation[0] = -worldLocation[0];
        //inverseWorldLocation[1] = -worldLocation[1];
        //inverseWorldLocation[2] = -worldLocation[2];
        vec3.negate(this.inverseWorldLocation, worldLocation);

        // Notify the children
        for (let i = 0, l = children.length; i < l; i++) {
            children[i].notify();
        }

        return this;
    },

    addChild(child) {
        this.children.push(child);
    },

    removeChild(child) {
        let children = this.children,
            index = children.indexOf(child);

        if (index !== -1) {
            children.splice(index, 1);
        }
    }
};
