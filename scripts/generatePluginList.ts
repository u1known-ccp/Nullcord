/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { existsSync, readdirSync, writeFileSync } from "fs";
import { getEntryPoint, isPluginFile, parseDevs, parseEquicordDevs, parseFile, PluginData } from "./utils";

(async () => {
    parseDevs();
    parseEquicordDevs();

    const args = process.argv.slice(2);

    const equicordFlag = args.includes("--equicord");
    const vencordFlag = args.includes("--vencord");
    const NullCordFlag = args.includes("--NullCord");
    const moggcordFlag = args.includes("--moggcord");

    let dirs: string[];

    if (equicordFlag) {
        dirs = ["src/equicordplugins/_core", "src/equicordplugins"];
    } else if (vencordFlag) {
        dirs = ["src/plugins", "src/plugins/_core"];
    } else if (NullCordFlag) {
        dirs = ["src/NullCordplugins/_core", "src/NullCordplugins"];
    } else if (moggcordFlag) {
        dirs = ["src/moggcordplugins/_core", "src/moggcordplugins"];
    } else {
        dirs = ["src/plugins", "src/plugins/_core", "src/equicordplugins/_core", "src/equicordplugins", "src/moggcordplugins/_core", "src/moggcordplugins", "src/NullCordplugins/_core", "src/NullCordplugins"];
    }

    // The moggcord/NullCord folders (and their _core subfolders) may not exist yet; skip missing dirs.
    dirs = dirs.filter(dir => existsSync(dir));

    const outputPath = args.find(a => !a.startsWith("--")) ?? null;

    const plugins = [] as PluginData[];

    await Promise.all(
        dirs.flatMap(dir =>
            readdirSync(dir, { withFileTypes: true })
                .filter(isPluginFile)
                .map(async dirent => {
                    const [data] = await parseFile(await getEntryPoint(dir, dirent));
                    plugins.sort().push(data);
                })
        )
    );

    const data = JSON.stringify(plugins);

    if (outputPath) {
        writeFileSync(outputPath, data);
    } else {
        console.log(data);
    }
})();

