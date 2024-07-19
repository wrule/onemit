import { parentPort } from 'worker_threads';
import { Onemit } from '.';

console.log('worker!');
const om = new Onemit((data) => parentPort?.postMessage(data));
parentPort?.on('message', (data) => om.receive(data));
setInterval(async () => {
  const a = await om.request('你好，世界');
  console.log(a);
}, 1000);
