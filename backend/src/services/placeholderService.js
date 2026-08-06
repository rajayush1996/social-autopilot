import prisma from '../config/db.js';

class PlaceholderService {
  static async getUserPlaceholders(userId) {
    const key = `user_placeholders_${userId || 'default'}`;
    try {
      const setting = await prisma.systemSetting.findUnique({ where: { key } });
      if (setting && Array.isArray(setting.value)) {
        return setting.value;
      }
    } catch (err) {
      console.warn(`[PlaceholderService] Error fetching placeholders for ${key}:`, err.message);
    }
    
    return [
      { id: 'def_1', name: 'link', value: '' },
      { id: 'def_2', name: 'name', value: '' },
      { id: 'def_3', name: 'website', value: '' },
      { id: 'def_4', name: 'promo_code', value: '' },
      { id: 'def_5', name: 'author_name', value: '' },
    ];
  }

  static async saveUserPlaceholders(userId, placeholders) {
    const key = `user_placeholders_${userId || 'default'}`;
    const updated = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: placeholders },
      create: { key, value: placeholders },
    });
    return updated.value;
  }

  static async createPlaceholder(userId, { name, value }) {
    const list = await this.getUserPlaceholders(userId);
    const cleanKey = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const newItem = { id: Date.now().toString(), name: cleanKey, value: value ? value.trim() : '' };
    const updatedList = [...list, newItem];
    await this.saveUserPlaceholders(userId, updatedList);
    return newItem;
  }

  static async updatePlaceholder(userId, id, { name, value }) {
    const list = await this.getUserPlaceholders(userId);
    const cleanKey = name ? name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') : null;
    let target = null;

    const updatedList = list.map(item => {
      if (item.id === id) {
        target = {
          ...item,
          name: cleanKey || item.name,
          value: value !== undefined ? value.trim() : item.value,
        };
        return target;
      }
      return item;
    });

    await this.saveUserPlaceholders(userId, updatedList);
    return target;
  }

  static async deletePlaceholder(userId, id) {
    const list = await this.getUserPlaceholders(userId);
    const updatedList = list.filter(item => item.id !== id);
    await this.saveUserPlaceholders(userId, updatedList);
    return { id, deleted: true };
  }
}

export default PlaceholderService;
