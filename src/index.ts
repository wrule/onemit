import { nanoid } from 'nanoid';

export
interface OnemitData {
  uid: string;
  onemit_type: 'request' | 'response';
  data: any;
}

export
class Onemit {
  public constructor(
    private readonly send: (data: OnemitData) => void,
    private readonly handleRequest?: (data: any) => any,
    private readonly timeout?: number,
  ) { }

  private requestMap = new Map<string, {
    resolve: (value: any) => void,
    reject: (reason?: any) => void,
  }>();

  public request(data: any, timeout?: number) {
    return new Promise<any>((resolve, reject) => {
      const uid = nanoid();
      this.send({ uid, onemit_type: 'request', data });
      this.requestMap.set(uid, { resolve, reject });
    });
  }

  public receive(onemitData: OnemitData) {
    if (onemitData.uid) {
      if (onemitData.onemit_type === 'request' && this.handleRequest) {
        this.send({
          uid: onemitData.uid,
          onemit_type: 'response',
          data: this.handleRequest(onemitData.data),
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
  console.log('hello world!');
}
