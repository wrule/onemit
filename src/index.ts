import EventEmitter from 'events';
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

  protected async receive(onemitData: OnemitData) {
    if (onemitData.uid) {
      if (onemitData.onemitType === 'request' && this.handleRequest) {
        this.send({
          uid: onemitData.uid,
          onemitType: 'response',
          url: onemitData.url,
          data: await this.handleRequest(onemitData.url, onemitData.data),
        });
      }
      if (onemitData.onemitType === 'response') {
        setTimeout(() => {
          const request = this.requestMap.get(onemitData.uid);
          request?.resolve(onemitData.data);
          this.requestMap.delete(onemitData.uid);
        }, 0);
      }
    }
  }
}

export
class OnemitPostMessage extends Onemit {
  public constructor(
    port: {
      postMessage: (...args: any[]) => any,
      on: (...args: any[]) => any,
    },
    handleRequest?: (url: string, data: any) => any,
    timeout = 60 * 1000,
  ) {
    super((data) => port.postMessage(data), handleRequest, timeout);
    port.on('message', (data: any) => this.receive(data));
  }
}

export
class OnemitEmit extends Onemit {
  public constructor(
    port: {
      emit: (...args: any[]) => any,
      on: (...args: any[]) => any,
    },
    handleRequest?: (url: string, data: any) => any,
    timeout = 60 * 1000,
  ) {
    super((data) => port.emit('onemit', data), handleRequest, timeout);
    port.on('onemit', (data: any) => this.receive(data));
  }
}


export
async function hello() {
  const event = new EventEmitter();
  const om1 = new OnemitEmit(event, (url, data) => {
    return data + 'om1';
  });
  console.log(await om1.request('', 'nihao'));
}
