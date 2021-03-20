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

const ROOM_WALLS = [
    new Surface(
        createUnitPlane().transform(MatrixMath.translation([0, 0, 0])),
        createEverywhere(),
        0
    ),
    new Surface(
        createUnitPlane().transform(MatrixMath.translation([0, 8, 0])),
        createEverywhere(),
        0
    ),
    new Surface(
        createUnitPlane()
            .transform(MatrixMath.rotation(0, -3.14159265 / 2.0, 0))
            .transform(MatrixMath.translation([0, 0, -4])),
        createEverywhere(),
        1
    ),
    new Surface(
        createUnitPlane()
            .transform(MatrixMath.rotation(0, -3.14159265 / 2.0, 0))
            .transform(MatrixMath.translation([0, 0, 4])),
        createEverywhere(),
        1
    ),
    new Surface(
        createUnitPlane()
            .transform(MatrixMath.rotation(0, 0, 3.14159265 / 2.0))
            .transform(MatrixMath.translation([4, 0, 0])),
        createEverywhere(),
        2
    ),
    new Surface(
        createUnitPlane()
            .transform(MatrixMath.rotation(0, 0, 3.14159265 / 2.0))
            .transform(MatrixMath.translation([-4, 0, 0])),
        createEverywhere(),
        2
    ),
];

export function createScene(): Scene {
    const s = new Scene(16, 8, 8);

    s.addMaterial(
        new Material([1, 0.05, 0.05], [0.1, 0.1, 0.1], 12.0, [0, 0, 0]),
        new Material([0.05, 1, 0.05], [0.1, 0.1, 0.1], 12.0, [0, 0, 0]),
        new Material([0.05, 0.05, 1], [0.1, 0.1, 0.1], 12.0, [0, 0, 0]),
        new Material([1, 1, 0.05], [0.3, 0.3, 0.3], 80.0, [0, 0, 0]),
        new Material([1, 0.05, 1], [0.3, 0.3, 0.3], 80.0, [0, 0, 0]),
        new Material([0.05, 1, 1], [0.3, 0.3, 0.3], 80.0, [0, 0, 0]),
        new Material([1, 1, 1], [0.5, 0.5, 0.5], 240, [0, 0, 0]),
        new Material([0, 0, 0], [0, 0, 0], 1, [15, 1, 1])
    );

    s.addPointLight(
        new PointLight([0, 4, 0], [2, 2, 2], [1.0, 0.55, 0.75]),
        new PointLight([2, 7, -2], [2, 2, 2], [1.0, 0.15, 0.25]),
        new PointLight([-2, 1, 2], [2, 2, 2], [1.0, 0.15, 0.25])
    );

    s.addSurface(
        new Surface(
            createUnitSphere().transform(
                MatrixMath.translation([-2.0, 3.0, 0.0])
            ),
            createEverywhere(),
            6
        ),
        new Surface(
            createUnitSphere().transform(
                MatrixMath.translation([0.0, 0.0, 0.0])
            ),
            createUnitSphere().transform(
                MatrixMath.translation([0.5, 0.5, 0.0])
            ),
            3
        ),
        new Surface(
            createUnitCylinder().transform(
                MatrixMath.translation([2.0, 5.0, 0.0])
            ),
            createEverywhere(),
            6
        ),
        new Surface(
            createHyperboloid(6, 4, 6).transform(
                MatrixMath.translation([0.0, 4.0, 0.0])
            ),
            createUnitSphere()
                .transform(MatrixMath.scale(1.25, 1.25, 1.25))
                .transform(MatrixMath.translation([0.0, 4.0, 0.0])),
            6
        ),
        ...ROOM_WALLS
    );

    return s;
}
