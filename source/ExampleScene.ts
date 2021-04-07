import {
    createEverywhere,
    createHyperboloid,
    createUnitCylinder,
    createUnitHyperboloid,
    createUnitPlane,
    createUnitSphere,
    Surface,
} from "./Surface";
import { MatrixMath } from "./MatrixMath";
import { Material } from "./Material";
import { PointLight } from "./PointLight";
import { Scene } from "./Scene";
/*
import EnvMapNX from "./textures/moonless-golf-exp2-1k/nx.png";
import EnvMapPX from "./textures/moonless-golf-exp2-1k/px.png";
import EnvMapNY from "./textures/moonless-golf-exp2-1k/ny.png";
import EnvMapPY from "./textures/moonless-golf-exp2-1k/py.png";
import EnvMapNZ from "./textures/moonless-golf-exp2-1k/nz.png";
import EnvMapPZ from "./textures/moonless-golf-exp2-1k/pz.png";
*/

import EnvMapNX from "./textures/sunflowers-exp4-1k/nx.png";
import EnvMapPX from "./textures/sunflowers-exp4-1k/px.png";
import EnvMapNY from "./textures/sunflowers-exp4-1k/ny.png";
import EnvMapPY from "./textures/sunflowers-exp4-1k/py.png";
import EnvMapNZ from "./textures/sunflowers-exp4-1k/nz.png";
import EnvMapPZ from "./textures/sunflowers-exp4-1k/pz.png";

const ROOM_WALLS = [
    new Surface(
        createUnitPlane().transform(MatrixMath.translation([0, 0, 0])),
        createEverywhere(),
        0
    ),
    new Surface(
        createUnitPlane()
            .transform(MatrixMath.rotation(0, 3.14159265 / 2.0, 0))
            .transform(MatrixMath.translation([0, 0, -4])),
        createUnitPlane().transform(MatrixMath.translation([0, 4, 0])),
        1
    ),
    new Surface(
        createUnitPlane()
            .transform(MatrixMath.rotation(0, 3.14159265 / 2.0, 0))
            .transform(MatrixMath.translation([0, 0, 4])),
        createUnitPlane().transform(MatrixMath.translation([0, 4, 0])),
        1
    ),
    new Surface(
        createUnitPlane()
            .transform(MatrixMath.rotation(0, 0, 3.14159265 / 2.0))
            .transform(MatrixMath.translation([4, 0, 0])),
        createUnitPlane().transform(MatrixMath.translation([0, 4, 0])),
        2
    ),
    new Surface(
        createUnitPlane()
            .transform(MatrixMath.rotation(0, 0, 3.14159265 / 2.0))
            .transform(MatrixMath.translation([-4, 0, 0])),
        createUnitPlane().transform(MatrixMath.translation([0, 4, 0])),
        2
    ),
];

const MATERIALS = [
    new Material(
        [0.6, 0.05, 0.05],
        [0.1, 0.1, 0.1],
        80.0,
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        1.0,
        [0, 0]
    ),
    new Material(
        [0.05, 0.6, 0.05],
        [0.7, 0.7, 0.7],
        1750.0,
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        1,
        [1, 0]
    ),
    new Material(
        [0.05, 0.05, 0.6],
        [0.1, 0.1, 0.1],
        12.0,
        [0, 0, 0],
        [0.0, 0.0, 0.0]
    ),
    new Material(
        [0.02, 0.02, 0.02],
        [0.5, 0.5, 0.5],
        1000,
        [0, 0, 0],
        [1, 1, 1],
        [1, 1, 1],
        1.25,
        [0.0, 1]
    ),
    new Material(
        [0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0],
        1,
        [0, 0, 0],
        [1, 1, 1],
        [1, 1, 1],
        1.25,
        [1, 1]
    ),
    new Material(
        [0.3, 0.3, 0.05],
        [0.1, 0.1, 0.1],
        10,
        [0, 0, 0.0],
        [0, 0, 0],
        [0, 0, 0],
        1.0,
        [0, 0]
    ),
];

const POINT_LIGHTS = [
    new PointLight([0, 4, 0], [1, 2, 1], [1.0, 0.15, 0.25]),
    new PointLight([0.0, 2, 0.0], [2, 1, 2], [1.0, 0.15, 0.25]),
];

export function createScene(): Scene {
    const s = new Scene(8, 8, 2);

    s.addMaterial(...MATERIALS);

    s.addPointLight(...POINT_LIGHTS);

    s.addSurface(
        new Surface(
            createUnitSphere().transform(
                MatrixMath.translation([-2.0, 1.25, 1.0])
            ),
            createEverywhere(),
            4
        ),
        new Surface(
            createUnitSphere().transform(
                MatrixMath.translation([2.0, 1.25, -1.0])
            ),
            createEverywhere(),
            5
        ),
        new Surface(
            createHyperboloid(6, 4, 6).transform(
                MatrixMath.translation([0.0, 0.5, 2.0])
            ),
            createUnitSphere()
                .transform(MatrixMath.scale(1.25, 1.25, 1.25))
                .transform(MatrixMath.translation([0.0, 1.0, 2.0])),
            3
        ),
        ...ROOM_WALLS
    );

    return s;
}

export function createImagesToLoad(): Map<string, string> {
    return new Map([
        ["env-nx", EnvMapNX],
        ["env-px", EnvMapPX],
        ["env-ny", EnvMapNY],
        ["env-py", EnvMapPY],
        ["env-nz", EnvMapNZ],
        ["env-pz", EnvMapPZ],
    ]);
}
