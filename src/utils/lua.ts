export function convertToLuaTable(obj: any): string {
    if (typeof obj === 'string') {
        return `"${obj}"`;
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
        return obj.toString();
    }

    if (Array.isArray(obj)) {
        return `{ ${obj.map(convertToLuaTable).join(', ')} }`;
    }

    if (typeof obj === 'object' && obj !== null) {
        const entries = Object.entries(obj).map(([key, value]) => {
            const formattedKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : `["${key}"]`;
            return `${formattedKey} = ${convertToLuaTable(value)}`;
        });
        return `{ ${entries.join(', ')} }`;
    }

    return 'nil';
}

// // Example usage:
// const exampleObject = {
//     name: "ChatGPT",
//     age: 4,
//     skills: ["AI", "Chat", "Code"],
//     details: {
//         languages: {
//             primary: "TypeScript",
//             secondary: "Python"
//         },
//         openSource: true
//     }
// };

// const luaTableString = convertToLuaTable(exampleObject);
// console.log(luaTableString);
