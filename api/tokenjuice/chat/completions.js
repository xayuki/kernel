import { createTokenJuiceHandler } from '../../../lib/tokenjuice-proxy.js';

export const config = {
  api: {
    bodyParser: false
  }
};

export default createTokenJuiceHandler('chat/completions');
