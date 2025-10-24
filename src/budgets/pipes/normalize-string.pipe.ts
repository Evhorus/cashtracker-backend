import { PipeTransform, Injectable } from '@nestjs/common';

@Injectable()
export class NormalizeStringPipe implements PipeTransform {
  transform(value: any): string {
    if (typeof value === 'string') {
      // Trim espacios iniciales y finales
      let result = value.trim();
      // Reemplaza múltiples espacios por uno solo
      result = result.replace(/\s+/g, ' ');
      return result;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value;
  }
}
