// Vercel's Node.js Function entrypoint. No listening server or SQLite file.
import {createApp} from '../lib/router.mjs';
const handle=createApp();
export default {fetch(request){return handle(request);}};
