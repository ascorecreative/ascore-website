varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

uniform float uTime;
uniform vec3 uCameraPosition;

void main() {
  vec3 viewDirection = normalize(vWorldPosition - uCameraPosition);
  vec3 normal = normalize(vNormal);

  // Fresnel effect — liquid glass rim shine
  float fresnel = pow(1.0 - max(dot(-viewDirection, normal), 0.0), 2.8);

  // Specular Highlight for Shiny High-Gloss Liquid Glass
  vec3 lightDir = normalize(vec3(2.0, 4.0, 3.0));
  vec3 reflectDir = reflect(-lightDir, normal);
  float spec = pow(max(dot(-viewDirection, reflectDir), 0.0), 32.0);

  // Elegant Sophisticated Cyber Palette (Deep Violet, Electric Cyan, Sapphire Blue)
  vec3 deepVoid = vec3(0.05, 0.04, 0.12);
  vec3 violetGlow = vec3(0.55, 0.15, 0.85);
  vec3 cyanShine = vec3(0.0, 0.96, 0.83);
  vec3 blueDeep = vec3(0.0, 0.45, 0.95);

  // Base liquid mix
  vec3 color = mix(deepVoid, blueDeep, fresnel * 0.7);
  color = mix(color, violetGlow, sin(vPosition.y * 2.0 + uTime * 0.5) * 0.5 + 0.5);
  color += cyanShine * pow(fresnel, 2.0) * 0.95;

  // Add sharp shiny specular highlight
  color += vec3(1.0) * spec * 1.2;

  // Semi-transparent high-gloss opacity
  float alpha = mix(0.75, 0.95, fresnel);

  gl_FragColor = vec4(color, alpha);
}
