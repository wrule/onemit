import { nanoid } from 'nanoid';
import { Worker } from 'worker_threads';

export
interface OnemitData {
  uid: string;
  onemitType: 'request' | 'response';
  url: string;
  data: any;
}

export
class Onemit {
  public constructor(
    private readonly send: (data: OnemitData) => void,
    private readonly handleRequest?: (url: string, data: any) => any,
    private readonly timeout = 60 * 1000,
  ) { }

  private requestMap = new Map<string, {
    resolve: (value: any) => void,
    reject: (reason?: any) => void,
  }>();

  public request(url: string, data: any, timeout?: number) {
    return new Promise<any>((resolve, reject) => {
      const uid = nanoid();
      this.send({ uid, onemitType: 'request', url, data });
      this.requestMap.set(uid, { resolve, reject });
      const realTimeout = timeout ?? this.timeout;
      if (realTimeout != null) {
        setTimeout(() => {
          reject('timeout');
          this.requestMap.delete(uid);
        }, realTimeout);
      }
    });
  }

  public receive(onemitData: OnemitData) {
    if (onemitData.uid) {
      if (onemitData.onemit_type === 'request' && this.handleRequest) {
        this.send({
          uid: onemitData.uid,
          onemit_type: 'response',
          url: onemitData.url,
          data: this.handleRequest(onemitData.url, onemitData.data),
        });
      }
      if (onemitData.onemit_type === 'response') {
        const request = this.requestMap.get(onemitData.uid);
        request?.resolve(onemitData.data);
        this.requestMap.delete(onemitData.uid);
      }
    }
  }
}

export
function hello() {
  const worker = new Worker('./dist/worker.js');
  const om = new Onemit((data) => worker.postMessage(data), (data) => data + '!');
  worker.on('message', (data) => om.receive(data));
}
