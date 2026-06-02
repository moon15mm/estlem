import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import OpenAI from 'openai';
import { Product } from '../../database/entities/product.entity';

export interface ParsedItem {
  name: string;
  nameAr: string;
  quantity: number;
  price: number;
  productId?: string;
  confidence: number;
}

@Injectable()
export class AiCartService {
  private openai: OpenAI | null = null;

  constructor(
    private config: ConfigService,
    @InjectRepository(Product) private productRepo: Repository<Product>,
  ) {
    const apiKey = config.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async parseShoppingList(rawText: string, storeId: string): Promise<ParsedItem[]> {
    const systemPrompt = `You are a shopping list parser for a Gulf retail store.
Extract items from the customer's text. Return JSON array with:
[{"name": "English name", "nameAr": "اسم عربي", "quantity": 1, "unit": "pcs"}]
Only return valid JSON, nothing else.`;

    let parsed: Array<{ name: string; nameAr: string; quantity: number }> = [];

    try {
      if (!this.openai) throw new Error('OpenAI not configured');
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: rawText },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const content = completion.choices[0]?.message?.content ?? '{"items":[]}';
      const result = JSON.parse(content);
      parsed = result.items ?? result ?? [];
    } catch {
      // Fallback: naive split
      parsed = rawText
        .split(/[\n,،]/g)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({
          name: line,
          nameAr: line,
          quantity: 1,
        }));
    }

    const result: ParsedItem[] = [];
    for (const item of parsed) {
      const safeName = (item.name ?? '').replace(/[%_\\]/g, '').substring(0, 100).trim();
      const safeNameAr = (item.nameAr ?? '').replace(/[%_\\]/g, '').substring(0, 100).trim();
      if (!safeName && !safeNameAr) continue;

      const product = await this.productRepo.findOne({
        where: [
          ...(safeName ? [{ storeId, name: ILike(`%${safeName}%`) }] : []),
          ...(safeNameAr ? [{ storeId, nameAr: ILike(`%${safeNameAr}%`) }] : []),
        ],
      });

      result.push({
        name: product?.name ?? item.name,
        nameAr: product?.nameAr ?? item.nameAr,
        quantity: item.quantity ?? 1,
        price: product ? (product.salePrice ?? product.price) : 0,
        productId: product?.id,
        confidence: product ? 0.9 : 0.5,
      });
    }

    return result;
  }
}
