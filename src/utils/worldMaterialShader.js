// 只改颜色阶段，原有笔刷 discard、透明测试、顶点变形与动画 uniform 继续执行。
export function addWorldPigment(shader, uniforms) {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `varying vec2 vWorldPaperUv;\nvarying vec3 vWorldPigmentPosition;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>', '#include <begin_vertex>\nvWorldPaperUv = uv;',
    ).replace('#include <project_vertex>', '#include <project_vertex>\nvWorldPigmentPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = `
        varying vec2 vWorldPaperUv;
        varying vec3 vWorldPigmentPosition;
        uniform vec3 uWorldPaper;
        uniform vec3 uWorldAccent;
        uniform vec3 uWorldInk;
        uniform sampler2D uWorldGrain;
        uniform sampler2D uWorldArtwork;
        uniform sampler2D uWorldSky;
        uniform float uWorldFacade;
        uniform vec2 uWorldRepeat;
        uniform float uWorldMode;
        uniform float uWorldTree;
        uniform float uWorldArtworkAlpha;
        ${shader.fragmentShader}
    `.replace('#include <color_fragment>', `
        #include <color_fragment>
        vec2 paperUv = vWorldPaperUv;
        float grain = texture2D(uWorldGrain, paperUv * 1.7).r;
        vec3 sourceColor = diffuseColor.rgb;
        #ifdef USE_MAP
            sourceColor = texture2D(map, vMapUv).rgb;
        #endif
        float inkValue = dot(sourceColor, vec3(0.299, 0.587, 0.114));
        float chroma = max(max(sourceColor.r, sourceColor.g), sourceColor.b) - min(min(sourceColor.r, sourceColor.g), sourceColor.b);
        float wash = clamp(0.18 + (1.0 - paperUv.y) * 0.25 + (1.0 - grain) * 1.1, 0.0, 0.68);
        if (uWorldTree > 0.5) wash = 1.0 - smoothstep(0.28, 0.66, paperUv.y);
        vec3 paperColor = mix(uWorldPaper, uWorldAccent, wash);
        vec3 artwork = vec3(1.0);
        if (uWorldMode > 0.5) {
            vec2 artworkUv = paperUv;
            #ifdef USE_MAP
                if (uWorldMode < 1.5) artworkUv = vMapUv;
            #endif
            vec4 artworkPixel = texture2D(uWorldArtwork, artworkUv * uWorldRepeat);
            artwork = artworkPixel.rgb;
            if (uWorldArtworkAlpha > 0.5) diffuseColor.a = opacity * artworkPixel.a;
            if (uWorldMode > 2.5 && uWorldMode < 3.5) {
                // 表情层沿用自己的线稿，只借取同一人物的局部色相。
                float top = max(max(artwork.r, artwork.g), artwork.b);
                paperColor *= pow((artwork + 0.2) / (top + 0.2), vec3(1.4));
            } else {
                paperColor = pow(artwork, vec3(2.2));
            }
        }
        vec3 pigment = mix(uWorldInk, paperColor, pow(clamp(inkValue, 0.0, 1.0), 1.25));
        if (uWorldMode > 0.5 && uWorldMode < 2.5) pigment = paperColor;
        if (uWorldMode > 3.5) pigment = mix(diffuseColor.rgb, pow(artwork, vec3(2.2)), 0.72);
        // 月云绘在同一块立面上，门洞、窗洞及其 alpha 沿用原模型。
        if (uWorldFacade > 0.5) {
            vec2 skyUv = vec2(vWorldPigmentPosition.x / 11.4 + 0.5, (vWorldPigmentPosition.y + 3.0) / 6.9);
            vec3 skyColor = pow(texture2D(uWorldSky, clamp(skyUv, 0.0, 1.0)).rgb, vec3(2.2));
            pigment = mix(pigment, skyColor, smoothstep(1.35, 2.65, vWorldPigmentPosition.y));
        }
        // 已有彩色标记和技术图标保留自己的颜色。
        float keepColor = smoothstep(0.08, 0.24, chroma);
        if (uWorldMode > 0.5) keepColor = 0.0;
        diffuseColor.rgb = mix(pigment, diffuseColor.rgb, keepColor * 0.92);
    `);
}
