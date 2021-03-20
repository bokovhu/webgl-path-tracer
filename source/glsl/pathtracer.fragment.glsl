#version 300 es

#define EPS 0.001
#define PI 3.14159265
#define N_MAX_MATERIALS 8
#define N_MAX_SURFACES 16
#define N_POINT_LIGHTS 8

precision highp float;

in vec4 v_rayDir;
in vec2 v_texCoord;

uniform struct {
    vec4 position;
    mat4 rayDirMatrix;
} camera;

uniform struct {
    mat4 Q;
    mat4 C;
    int materialId;
} surfaces[N_MAX_SURFACES];

uniform struct {
    vec3 diffuse;
    vec4 specular;
    vec3 emissive;
} materials[N_MAX_MATERIALS];

uniform struct {
    vec3 position;
    vec3 intensity;
    vec3 falloff;
    int enabled;
} pointLights[N_POINT_LIGHTS];

uniform float time;
uniform sampler2D previousTexture;
uniform float pixelSize;

struct Ray {
    vec4 origin;
    vec4 direction;
};

struct TraceResult {
    vec4 hitPoint;
    vec4 hitNormal;
    vec4 rayOrigin;
    vec4 rayDirection;
    int hitMaterialId;
};

const vec3 lightAmbientIntensity = vec3(0.1, 0.1, 0.1);

out vec4 out_finalColor;

float intersectQuadric(vec4 rO, vec4 rD, mat4 surface, mat4 clipper){
    float a = dot(rD * surface, rD);
    float b = dot(rD * surface, rO) + dot(rO * surface, rD);
    float c = dot(rO * surface, rO);

    if (abs(a) < 0.001){
        float t = -c / b;
        vec4 h = rO + rD * t;
        if (dot(h * clipper, h) > 0.0) {
            t = -1.0;
        }
        return t;
    }

    float discr = b * b - 4.0 * a * c;
    if (discr < 0.0){
        return -1.0;
    }
    float t1 = (-b - sqrt(discr)) / (2.0 * a);
    float t2 = (-b + sqrt(discr)) / (2.0 * a);

    vec4 h1 = rO + rD * t1;
    if (dot(h1 * clipper, h1) > 0.0) {
        t1 = -1.0;
    }

    vec4 h2 = rO + rD * t2;
    if (dot(h2 * clipper, h2) > 0.0) {
        t2 = -1.0;
    }

    return (t1 < 0.0) ? t2 : ((t2 < 0.0) ? t1 : min(t1, t2));
}

void traceScene(in Ray ray, out TraceResult result) {

    result.hitPoint = ray.origin;
    result.hitMaterialId = -1;
    result.rayOrigin = ray.origin;
    result.rayDirection = ray.direction;

    float bestDistance = 100000.0;
    int bestIndex = 0;

    for(int i = 0; i < N_MAX_SURFACES; i++) {

        if(surfaces[i].materialId < 0) {
            continue;
        }

        float surfaceDistance = intersectQuadric(
            ray.origin, ray.direction,
            surfaces[i].Q, surfaces[i].C
        );

        if(surfaceDistance > 0.0 && surfaceDistance < bestDistance) {
            bestDistance = surfaceDistance;
            bestIndex = i;
        }

    }

    if(bestDistance < 99999.0) {
        result.hitPoint = ray.origin + bestDistance * ray.direction;
        result.hitMaterialId = surfaces[bestIndex].materialId;
        vec4 grad = result.hitPoint * surfaces[bestIndex].Q + surfaces[bestIndex].Q * result.hitPoint;
        result.hitNormal = vec4(normalize(grad.xyz), 0.0);
        if(dot(result.hitNormal.xyz, ray.direction.xyz) > 0.0) {
            result.hitNormal = -1.0 * result.hitNormal;
        }
    }

}

vec3 ambientLighting(in TraceResult traceResult) {

    return lightAmbientIntensity * materials[traceResult.hitMaterialId].diffuse;

}

vec3 pointLightRadiance(in TraceResult traceResult, int index) {

    if(pointLights[index].enabled <= 0) return vec3(0.0);

    vec3 lPosition = pointLights[index].position;
    vec3 lIntensity = pointLights[index].intensity;
    vec3 lFalloff = pointLights[index].falloff;

    vec3 radiance = vec3(0.0);
    vec3 surfaceToLight = normalize(lPosition - traceResult.hitPoint.xyz);

    Ray shadowRay = Ray(
        traceResult.hitPoint + 0.01 * traceResult.hitNormal,
        vec4(surfaceToLight, 0.0)
    );
    TraceResult shadowTraceResult;

    traceScene(shadowRay, shadowTraceResult);
    float surfaceLightDistance = length(lPosition - traceResult.hitPoint.xyz);
    float shadowDistance = length(shadowRay.origin - shadowTraceResult.hitPoint);

    if(shadowTraceResult.hitMaterialId < 0 || shadowDistance > surfaceLightDistance) {

        float cosTheta = dot(traceResult.hitNormal.xyz, surfaceToLight);
        float attenuation = 1.0 / (lFalloff.x + lFalloff.y * surfaceLightDistance + lFalloff.z * pow(surfaceLightDistance, 2.0));

        if(cosTheta > 0.0) {
            vec3 Kd = materials[traceResult.hitMaterialId].diffuse;
            vec4 Ks = materials[traceResult.hitMaterialId].specular;
            radiance += attenuation * cosTheta * lIntensity * Kd;

            vec3 eyeToSurface = normalize(camera.position.xyz - traceResult.hitPoint.xyz);
            vec3 halfway = normalize(eyeToSurface + surfaceToLight);
            float cosAlpha = dot(halfway, traceResult.hitNormal.xyz);
            float cosBeta = dot(traceResult.hitNormal.xyz, eyeToSurface);
            if(cosAlpha < 0.0) {
                cosAlpha = 0.0;
            }

            radiance += lIntensity * attenuation * Ks.xyz * pow(cosAlpha, Ks.w);
        }

        return radiance;

    }
}

vec3 directLighting(in TraceResult traceResult) {

    vec3 total = vec3(0.0);

    for(int i = 0; i < N_POINT_LIGHTS; i++) {

        total += pointLightRadiance(traceResult, i);

    }

    return total;

}

float rand(vec2 co){
    return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
}

vec2 rand2(vec2 co) {
    return vec2(
        rand(co + vec2(1.0, 0.0)),
        rand(co + vec2(0.0, 1.0))
    );
}

vec3 rand3(vec2 co) {
    return vec3(
        rand(co + vec2(1.0, 0.0)),
        rand(co + vec2(0.0, 1.0)),
        rand(co + vec2(1.0, 1.0))
    );
}

vec3 illuminate(in TraceResult primaryResult) {

    vec3 total = vec3(0.0);

    total += ambientLighting(primaryResult);

    float w = 1.0;
    TraceResult giTraceResult = primaryResult;

    for(int i = 0; i < 8; i++) {

        float cosAlpha = dot(giTraceResult.hitNormal.xyz, giTraceResult.rayDirection.xyz);
        if(cosAlpha < 0.0) {
            cosAlpha *= -1.0;
        }

        total += cosAlpha * w * directLighting(giTraceResult);
        total += cosAlpha * w * materials[giTraceResult.hitMaterialId].emissive;
        Ray giRay = Ray(
            giTraceResult.hitPoint + 0.01 * giTraceResult.hitNormal,
            vec4(
                normalize(
                    giTraceResult.hitNormal.xyz + vec3(
                        2.0 * rand(vec2(giTraceResult.hitPoint.x + time, giTraceResult.hitPoint.x)) - 1.0,
                        2.0 * rand(vec2(giTraceResult.hitPoint.z, giTraceResult.hitPoint.y + time)) - 1.0,
                        2.0 * rand(vec2(giTraceResult.hitPoint.y + time, giTraceResult.hitPoint.z)) - 1.0
                    )
                ),
                0.0
            )
        );
        traceScene(giRay, giTraceResult);

        if(giTraceResult.hitMaterialId < 0) {
            break;
        }

        w = w * cosAlpha;

    }

    return total;

}

void main() {

    Ray primaryRay = Ray(camera.position, vec4(normalize(v_rayDir.xyz), 0.0));
    TraceResult primaryResult;

    traceScene(primaryRay, primaryResult);

    if(primaryResult.hitMaterialId >= 0) {
        out_finalColor = 0.995 * texture(previousTexture, v_texCoord) + 0.005 * vec4(illuminate(primaryResult), 1.0);
        // out_finalColor = vec4(directLighting(primaryResult), 1.0);
        // out_finalColor = vec4(primaryResult.hitNormal.xyz, 1.0);
    } else {
        discard;
    }

}
