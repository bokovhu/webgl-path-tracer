#version 300 es

#define EPS 0.001
#define PI 3.14159265

#define N_INDIRECT_BOUNCES 6
#define N_REFLECTION_BOUNCES 4
#define N_SAMPLES 1

#define MIX_MIN 0.25
#define MIX_MAX 0.999
#define MIX_SLOPE 0.00001

// #define BRANCHED_PATH_TRACING

/// <DEFINES>

precision highp float;

const float PHIG = 1.61803398874989484820459 * 00000.1;
const float PIG = 3.14159265358979323846264 * 00000.1;
const float SQ2G = 1.41421356237309504880169 * 10000.0;

in vec4 v_rayDir;
in vec2 v_texCoord;

uniform struct {
    vec4 position;
    mat4 rayDirMatrix;
    vec3 front;
    vec3 up;
    vec3 right;
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
    vec3 reflectivity;
    vec4 refractivity;
    vec2 reflRefrProbability;
} materials[N_MAX_MATERIALS];

uniform struct {
    vec3 position;
    vec3 intensity;
    vec3 falloff;
    int enabled;
} pointLights[N_POINT_LIGHTS];

uniform struct {
    float time;
    float seed;
    sampler2D previousTexture;
    samplerCube environmentMapTexture;
    float environmentExposure;
    int frameCount;
    float pixelSize;
} scene;

float goldRand(in vec3 seed) {
    return fract(sin(dot(seed.xy * (seed.z + PHIG), vec2(PHIG, PIG))) * SQ2G);
}

float perPixelRandom() {
    return goldRand(vec3(gl_FragCoord.xy, scene.seed));
}

float perPixelRandom(in float offset) {
    return goldRand(vec3(gl_FragCoord.xy, scene.seed * offset + scene.time));
}

struct TraceResult {
    vec3 hitPoint;
    vec3 hitNormal;
    vec3 rayOrigin;
    vec3 rayDirection;
    int hitMaterialId;
};

TraceResult shadowTraceResult;
TraceResult giTraceResult;

const vec3 lightAmbientIntensity = vec3(0.1, 0.1, 0.1);

out vec4 out_finalColor;

vec3 sampleEnv(in vec3 dir) {
    return pow(texture(scene.environmentMapTexture, dir).xyz, vec3(scene.environmentExposure));
}

float intersectQuadric(in vec4 rO, in vec4 rD, in int index) {

    mat4 surface = surfaces[index].Q;
    mat4 clipper = surfaces[index].C;

    float a = dot(rD * surface, rD);
    float b = dot(rD * surface, rO) + dot(rO * surface, rD);
    float c = dot(rO * surface, rO);

    if(abs(a) < 0.001) {
        float t = -c / b;
        vec4 h = rO + rD * t;
        if(dot(h * clipper, h) > 0.0) {
            t = -1.0;
        }
        return t;
    }

    float discr = b * b - 4.0 * a * c;
    if(discr < 0.0) {
        return -1.0;
    }
    float t1 = (-b - sqrt(discr)) / (2.0 * a);
    float t2 = (-b + sqrt(discr)) / (2.0 * a);

    vec4 h1 = rO + rD * t1;
    if(dot(h1 * clipper, h1) > 0.0) {
        t1 = -1.0;
    }

    vec4 h2 = rO + rD * t2;
    if(dot(h2 * clipper, h2) > 0.0) {
        t2 = -1.0;
    }

    return (t1 < 0.0) ? t2 : ((t2 < 0.0) ? t1 : min(t1, t2));
}

void traceScene(in vec3 rO, in vec3 rD, out TraceResult result) {

    result.hitPoint = rO;
    result.hitMaterialId = -1;
    result.rayOrigin = rO;
    result.rayDirection = rD;

    float bestDistance = 100000.0;
    int bestIndex = 0;

    for(int i = 0; i < surfaces.length(); i++) {

        if(surfaces[i].materialId < 0) {
            continue;
        }

        float surfaceDistance = intersectQuadric(vec4(rO, 1.0), vec4(rD, 0.0), i);

        if(surfaceDistance > 0.0 && surfaceDistance < bestDistance) {
            bestDistance = surfaceDistance;
            bestIndex = i;
        }

    }

    if(bestDistance < 99999.0) {

        result.hitPoint = rO + bestDistance * rD;
        result.hitMaterialId = surfaces[bestIndex].materialId;
        vec4 grad = vec4(result.hitPoint, 1.0) * surfaces[bestIndex].Q + surfaces[bestIndex].Q * vec4(result.hitPoint, 1.0);
        result.hitNormal = normalize(grad.xyz);

        if(dot(result.hitNormal, rD) > 0.0) {
            result.hitNormal = -1.0 * result.hitNormal;
        }
    }

}

vec3 ambientLighting(in TraceResult traceResult) {
    return lightAmbientIntensity * materials[traceResult.hitMaterialId].diffuse;
}

vec3 pointLightRadiance(in vec3 surfacePoint, in vec3 surfaceNormal, in int materialId, in int index) {

    if(pointLights[index].enabled <= 0)
        return vec3(0.0);

    vec3 lPosition = pointLights[index].position;
    vec3 lIntensity = pointLights[index].intensity;
    vec3 lFalloff = pointLights[index].falloff;

    vec3 radiance = vec3(0.0);

    vec3 surfaceToLight = lPosition - surfacePoint;
    float surfaceLightDistance = length(surfaceToLight);
    surfaceToLight /= surfaceLightDistance;

    vec3 shadowRO = surfacePoint + surfaceNormal * 0.01;
    vec3 shadowRD = surfaceToLight;

    traceScene(shadowRO, shadowRD, shadowTraceResult);
    float shadowDistance = length(shadowRO - shadowTraceResult.hitPoint);

    if(shadowTraceResult.hitMaterialId < 0 || shadowDistance > surfaceLightDistance) {

        float cosTheta = dot(surfaceNormal, surfaceToLight);
        float attenuation = 1.0 / (lFalloff.x + lFalloff.y * surfaceLightDistance + lFalloff.z * surfaceLightDistance * surfaceLightDistance);

        if(cosTheta > 0.0) {
            vec3 Kd = materials[materialId].diffuse;
            vec4 Ks = materials[materialId].specular;
            radiance += attenuation * cosTheta * lIntensity * Kd;

            vec3 eyeToSurface = normalize(camera.position.xyz - surfacePoint);
            vec3 halfway = normalize(eyeToSurface + surfaceToLight);
            float cosAlpha = dot(halfway, surfaceNormal);
            if(cosAlpha < 0.0) {
                cosAlpha = 0.0;
            }

            radiance += lIntensity * attenuation * Ks.xyz * pow(cosAlpha, Ks.w);
        }

    }

    return radiance;

}

vec3 directRadiance(vec3 P, vec3 N, int m, vec3 w) {
    vec3 total = vec3(0.0);
    for(int i = 0; i < pointLights.length(); i++) {
        total += w * pointLightRadiance(P, N, m, i);
    }
    return total;
}

#ifndef BRANCHED_PATH_TRACING
vec3 directLighting(in TraceResult traceResult) {

    vec3 total = vec3(0.0);
    vec3 weight = vec3(1.0);

    vec3 reflRO = traceResult.rayOrigin;
    vec3 reflRD = traceResult.rayDirection;
    vec3 hitP = traceResult.hitPoint;
    vec3 hitN = traceResult.hitNormal;
    int hitM = traceResult.hitMaterialId;

    for(int reflectionIndex = 0; reflectionIndex < N_REFLECTION_BOUNCES; reflectionIndex++) {

        total += directRadiance(hitP, hitN, hitM, weight);

        vec2 reflRefrProbability = materials[hitM].reflRefrProbability;
        float rnd = perPixelRandom(-1.0 * float(reflectionIndex)) * (reflRefrProbability.x + reflRefrProbability.y);
        vec3 dWeight = vec3(0.0);

        reflRO = hitP + 0.01 * hitN;

        TraceResult reflTraceResult;

        if(rnd < reflRefrProbability.x) {
            reflRD = normalize(reflect(reflRD, hitN));
            dWeight = materials[hitM].reflectivity;
        } else {
            reflRO = hitP - 0.01 * hitN;
            reflRD = normalize(refract(reflRD, hitN, materials[hitM].refractivity.w));

            dWeight = materials[hitM].refractivity.xyz;
        }

        weight = weight * dWeight;

        if(length(weight) <= 0.001) {
            break;
        }

        traceScene(reflRO, reflRD, reflTraceResult);

        hitP = reflTraceResult.hitPoint;
        hitN = reflTraceResult.hitNormal;
        hitM = reflTraceResult.hitMaterialId;

        if(hitM < 0) {
            total += weight * sampleEnv(reflRD);
            break;
        }

    }

    return total;

}
#endif

vec4 indirectSampleDirection(in vec3 N, in float i) {

    vec3 samp = 2.0 * vec3(perPixelRandom(2.0 + 3.0 * i), perPixelRandom(3.0 + 3.0 * i), perPixelRandom(4.0 + 3.0 * i)) - vec3(1.0);
    vec3 NN = normalize(N + (samp * 2.0 - vec3(1.0)));

    return vec4(normalize(N + (samp * 2.0 - vec3(1.0))), abs(dot(N, NN)));

}

#ifdef BRANCHED_PATH_TRACING
vec4 illuminateIndirect(in vec3 hitP, in vec3 hitN, float i, out TraceResult giTraceResult) {

    vec4 samp = indirectSampleDirection(hitN, float(i));

    vec3 giRO = hitP + 0.01 * hitN;
    vec3 giRD = normalize(samp.xyz);
    traceScene(giRO, giRD, giTraceResult);

    if(giTraceResult.hitMaterialId < 0) {
        vec3 env = sampleEnv(giRD);
        return vec4(env * samp.w, samp.w);
    }

    return vec4(directRadiance(giTraceResult.hitPoint, giTraceResult.hitNormal, giTraceResult.hitMaterialId, vec3(1.0)) * samp.w + samp.w * materials[giTraceResult.hitMaterialId].emissive, samp.w);

}

vec4 illuminateReflection(in vec3 hitP, in vec3 hitN, in int hitM, in vec3 hitRD, out TraceResult traceResult) {

    vec3 reflRD = normalize(reflect(hitRD, hitN));
    vec3 reflRO = hitP + 0.01 * hitN;

    vec3 reflectivity = materials[hitM].reflectivity;

    traceScene(reflRO, reflRD, traceResult);

    if(traceResult.hitMaterialId < 0) {
        vec3 env = sampleEnv(reflRD);
        return vec4(reflectivity * env, 0.0);
    } else {

        return vec4(reflectivity * directRadiance(traceResult.hitPoint, traceResult.hitNormal, traceResult.hitMaterialId, vec3(1.0)), reflectivity.x);

    }

}

vec4 illuminateRefraction(in vec3 hitP, in vec3 hitN, in int hitM, in vec3 hitRD, out TraceResult traceResult) {

    vec3 refrRO = hitP - 0.01 * hitN;

    vec4 refractivity = materials[hitM].refractivity;

    vec3 refrRD = normalize(refract(hitRD, hitN, refractivity.w));

    traceScene(refrRO, refrRD, traceResult);

    if(traceResult.hitMaterialId < 0) {
        vec3 env = sampleEnv(refrRD);
        return vec4(refractivity.xyz * env, 0.0);
    } else {

        return vec4(refractivity.xyz * directRadiance(traceResult.hitPoint, traceResult.hitNormal, traceResult.hitMaterialId, vec3(1.0)), refractivity.x);

    }

}
#endif

#ifdef BRANCHED_PATH_TRACING
vec3 illuminate(in TraceResult primaryResult) {

    vec3 total = vec3(0.0);
    vec3 totalIndirect = vec3(0.0);

    total += ambientLighting(primaryResult);
    total += directRadiance(primaryResult.hitPoint, primaryResult.hitNormal, primaryResult.hitMaterialId, vec3(1.0));

    float w = 1.0;
    float w2 = 1.0;
    giTraceResult = primaryResult;

    for(int i = 0; i < N_INDIRECT_BOUNCES; i++) {

        if(w <= 0.0001) {
            break;
        }

        float bounceType = perPixelRandom(scene.seed + float(i));
        vec2 reflRefrProbability = materials[giTraceResult.hitMaterialId].reflRefrProbability;

        if(bounceType < 0.5 && reflRefrProbability.x + reflRefrProbability.y >= 0.01) {

            // Create a reflection/refraction ray

            float reflOrRefr = perPixelRandom(scene.seed + -1.0 * float(i)) * (reflRefrProbability.x + reflRefrProbability.y);

            if(reflOrRefr < reflRefrProbability.x) {

                // Should reflect if possible

                vec4 reflection = illuminateReflection(giTraceResult.hitPoint, giTraceResult.hitNormal, giTraceResult.hitMaterialId, giTraceResult.rayDirection, giTraceResult);

                total += w2 * reflection.xyz;
                w2 = w2 * reflection.w;

            } else {

                // Should refract if possible

                vec4 refraction = illuminateRefraction(giTraceResult.hitPoint, giTraceResult.hitNormal, giTraceResult.hitMaterialId, giTraceResult.rayDirection, giTraceResult);

                total += w2 * refraction.xyz;
                w2 = w2 * refraction.w;

            }

        } else {

            vec4 indirect = illuminateIndirect(giTraceResult.hitPoint, giTraceResult.hitNormal, float(i), giTraceResult);

            totalIndirect += w * indirect.xyz;
            w = w * indirect.w;

        }
    }

    return total + totalIndirect;

}
#endif

#ifndef BRANCHED_PATH_TRACING
vec3 illuminate(in TraceResult primaryResult) {

    vec3 total = vec3(0.0);
    vec3 totalIndirect = vec3(0.0);

    total += ambientLighting(primaryResult);
    total += directLighting(primaryResult);

    float w = 1.0;
    TraceResult giTraceResult = primaryResult;

    vec3 giRO = vec3(0.0);
    vec3 giRD = vec3(0.0);

    for(int i = 0; i < N_INDIRECT_BOUNCES; i++) {

        vec4 samp = indirectSampleDirection(giTraceResult.hitNormal, float(i));

        giRO = giTraceResult.hitPoint + 0.01 * giTraceResult.hitNormal;
        giRD = normalize(samp.xyz);
        traceScene(giRO, giRD, giTraceResult);

        if(giTraceResult.hitMaterialId < 0) {
            vec3 env = sampleEnv(giRD);
            total += w * env * samp.w;
            break;
        }

        totalIndirect += w * directLighting(giTraceResult) * samp.w + w * materials[giTraceResult.hitMaterialId].emissive;
        w = w * samp.w;

    }

    return total + totalIndirect;

}
#endif

void main() {

    vec3 total = vec3(0.0);

    for(int i = 0; i < N_SAMPLES; i++) {

        vec3 primaryRO = camera.position.xyz;
        vec3 primaryRD = normalize(v_rayDir.xyz);

        vec2 rnd = vec2(perPixelRandom(float(i)), perPixelRandom(float(-i)));

        rnd = (rnd * 2.0 - vec2(1.0)) * scene.pixelSize;

        primaryRD += 0.5 * (rnd.x * camera.right + rnd.y * camera.up);

        primaryRD = normalize(primaryRD);

        TraceResult primaryResult;

        traceScene(primaryRO, primaryRD, primaryResult);

        if(primaryResult.hitMaterialId >= 0) {
            total += illuminate(primaryResult);
        } else {
            total += sampleEnv(primaryRD);
        }

    }

    total = total / float(N_SAMPLES);

    out_finalColor = vec4(total, 1.0);

}
