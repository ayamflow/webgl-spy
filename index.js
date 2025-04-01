const SPY_OG_PREFIX = 'WEBGL_SPY_'

const TYPES = {
    DRAW: 'draw',
    CLEAR: 'clear',
    BIND: 'bind',
}

// Taken from 
// https://github.com/mrdoob/three.js WebGLIndexedBufferRenderer.js
// and WebGLBufferRenderer.js
const SPY_METHODS = [
    'clear',
    'bindFramebuffer',
    'drawElements',
    'drawElementsInstanced',
    'multiDrawElementsWEBGL',
    'multiDrawElementsInstancedWEBGL',
    'drawArrays',
    'drawArraysInstanced',
    'multiDrawArraysWEBGL',
    'multiDrawArraysInstancedWEBGL',
]

const NO_PROGRAM = [
    'clear',
    'bindFramebuffer',
]

const DEPTH_BUFFER_BIT = 256
const STENCIL_BUFFER_BIT = 1024
const COLOR_BUFFER_BIT = 16384
const DRAW_MODES = ['POINTS', 'LINES', 'LINE_LOOP', 'LINE_STRIP', 'TRIANGLES', 'TRIANGLE_FAN']
const CURRENT_PROGRAM = 35725

let bufferId = 0
const bufferMap = new WeakMap()

export default class WebglSpy {
    constructor(gl) {
        this.gl = gl
        this.calls = []
        this.hasSpied = false
    }

    spyContext(methods) {
        const gl = this.gl

        const spyCalls = (gl, methodName, res, args) => {
            const details = getDetails(gl, methodName, args)
            this.calls.push(details)
        }
        const spyBuffer = (gl, methodName, buffer) => {
            bufferMap.set(buffer, bufferId++)
        }
        
        methods.forEach(methodName => spyMethod(gl, methodName, spyCalls))
        spyMethod(gl, 'createFramebuffer', spyBuffer)
    }

    unspyContext() {
        const gl = this.gl
        Object.getOwnPropertyNames(gl).forEach(propName => {
            if (propName.indexOf(SPY_OG_PREFIX) === 0) {
                const methodName = propName.replace(SPY_OG_PREFIX, '')

                // Cleanup all property functions
                // will default back to prototype methods
                gl[methodName] = null
                delete gl[methodName]
                gl[propName] = null
                delete gl[propName]
            }
        })
    }

    startCapture(reset = true) {
        if (!this.hasSpied) {
            this.spyContext(SPY_METHODS)
            this.hasSpied = true
        }
        if (reset) this.calls.length = 0
    }

    endCapture(onlyDraws = false) {
        let result = this.calls.slice()
        this.calls.length = 0
        if (onlyDraws) result = result.filter(command => command.draw.indexOf('draw') > -1)
        return result
    }

    destroy() {
        this.unspyContext(this.gl)
        this.gl = null
    }
}

function getDetails(gl, methodName, args) {
    // Get drawcall details
    let draw = methodName
    const type = getType(methodName)

    if (methodName.toLowerCase().indexOf('draw') > -1) {
        const mode = DRAW_MODES.filter(mode => args[0] === gl[mode])
        draw = `${draw}: ${mode}, ${args[1]} indices`

        if (methodName.toLowerCase().indexOf('array') > -1) {
            const count = args[2]
            draw = `${draw}, ${count} vertices`

        }
    }

    if (methodName === 'bindFramebuffer') {
        if (args[1]) {
            const buffer = args[1]
            const id = bufferMap.get(buffer)
            draw = `${draw} ID - ${id}`
        }
    }

    // Clear bits details
    if (methodName === 'clear') {
        const depth = DEPTH_BUFFER_BIT & args[0]
        const stencil = STENCIL_BUFFER_BIT & args[0]
        const color = COLOR_BUFFER_BIT & args[0]

        const bits = ['DEPTH', 'STENCIL', 'COLOR'].filter((value, i) => [depth, stencil, color][i])
        draw = `${draw}: ${bits.join(', ')}`
    }

    // Get program name
    let programName
    if (NO_PROGRAM.indexOf(methodName) < 0) {
        const program = gl.getParameter(CURRENT_PROGRAM)
        if (program) {
            const shaders = gl.getAttachedShaders(program)
            const source = gl.getShaderSource(shaders[0])
            const name = readNameFromShaderSource(source)
            programName = name || 'Unnamed shader'
        }
    }
    
    return programName ? { draw, program: programName, type } : { draw, type }
}

function getType(methodName) {
    const method = methodName.toLowerCase()
    if (method.indexOf('draw') > -1) return TYPES.DRAW
    if (method.indexOf('bind') > -1) return TYPES.BIND
    if (methodName === 'clear') return TYPES.CLEAR
}

function spyMethod(gl, methodName, spy) {
    const ogMethod = gl[methodName]
    gl[SPY_OG_PREFIX + methodName] = ogMethod
    gl[methodName] = (...args) => {
        const res = ogMethod.apply(gl, args)
        spy(gl, methodName, res, args)
        return res
    }
}

// Taken from
// https://github.com/BabylonJS/Spector.js/blob/5f652baa091b96e79f8d7d98bc6cc1d4e404ad00/src/backend/utils/readProgramHelper.ts#L63C5-L101C2
// could replace with https://github.com/glslify/glsl-shader-name ?
function readNameFromShaderSource(source) {
    try {
        let name = ''
        let match

        const shaderNameRegex = /#define[\s]+SHADER_NAME[\s]+([\S]+)(\n|$)/gi
        match = shaderNameRegex.exec(source)
        if (match !== null) {
            if (match.index === shaderNameRegex.lastIndex) {
                shaderNameRegex.lastIndex++
            }
            name = match[1]
        }

        if (name === '') {
            // #define SHADER_NAME_B64 44K344Kn44O844OA44O8
            // #define SHADER_NAME_B64 8J+YjvCfmIE=
            const shaderName64Regex = /#define[\s]+SHADER_NAME_B64[\s]+([\S]+)(\n|$)/gi
            match = shaderName64Regex.exec(source)
            if (match !== null) {
                if (match.index === shaderName64Regex.lastIndex) {
                    shaderName64Regex.lastIndex++
                }

                name = match[1]
            }

            if (name) {
                name = decodeURIComponent(atob(name))
            }
        }

        return name
    }
    catch (e) {
        return null
    }
}