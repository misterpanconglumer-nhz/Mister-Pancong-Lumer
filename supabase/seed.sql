-- Seed data for Mister Pancong Lumer
-- Initial sample products & variants

DO $$
DECLARE
  cat_pancong_id UUID;
  cat_minuman_id UUID;
  p_pancong_lumer_id UUID;
  p_pancong_crispy_id UUID;
  p_es_teh_id UUID;
BEGIN
  SELECT id INTO cat_pancong_id FROM public.categories WHERE slug = 'pancong';
  SELECT id INTO cat_minuman_id FROM public.categories WHERE slug = 'minuman';

  -- Product 1: Pancong Lumer
  IF cat_pancong_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Pancong Lumer Original') THEN
    INSERT INTO public.products (category_id, name, description, image_url, base_price, is_active)
    VALUES (
      cat_pancong_id,
      'Pancong Lumer Original',
      'Pancong khas Mister Pancong Lumer dengan adonan lembut dan lumer di mulut.',
      'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80',
      12000.00,
      TRUE
    ) RETURNING id INTO p_pancong_lumer_id;

    -- Variants for Pancong Lumer
    INSERT INTO public.product_variants (product_id, variant_type, name, additional_price) VALUES
      (p_pancong_lumer_id, 'rasa', 'Cokelat Lumer', 3000.00),
      (p_pancong_lumer_id, 'rasa', 'Keju Melimpah', 3000.00),
      (p_pancong_lumer_id, 'rasa', 'Tiramisu', 4000.00),
      (p_pancong_lumer_id, 'rasa', 'Matcha Green Tea', 4000.00),
      (p_pancong_lumer_id, 'rasa', 'Original Gula Halus', 0.00),
      (p_pancong_lumer_id, 'ukuran', 'Porsi 1 (Setengah Matang)', 0.00),
      (p_pancong_lumer_id, 'ukuran', 'Porsi 2 (Double / Matang)', 8000.00),
      (p_pancong_lumer_id, 'topping', 'Topping Keju Parut Extra', 2000.00),
      (p_pancong_lumer_id, 'topping', 'Topping Oreo Crumble', 2500.00),
      (p_pancong_lumer_id, 'topping', 'Topping Choco Chip', 2000.00);
  END IF;

  -- Product 2: Pancong Crispy
  IF cat_pancong_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Pancong Crispy Crumb') THEN
    INSERT INTO public.products (category_id, name, description, image_url, base_price, is_active)
    VALUES (
      cat_pancong_id,
      'Pancong Crispy Crumb',
      'Pancong matang renyah di luar, lembut di dalam.',
      'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=500&q=80',
      13000.00,
      TRUE
    ) RETURNING id INTO p_pancong_crispy_id;

    INSERT INTO public.product_variants (product_id, variant_type, name, additional_price) VALUES
      (p_pancong_crispy_id, 'rasa', 'Cokelat Keju', 4000.00),
      (p_pancong_crispy_id, 'rasa', 'Red Velvet', 4000.00),
      (p_pancong_crispy_id, 'rasa', 'Taro Sweet', 4000.00);
  END IF;

  -- Product 3: Es Teh Manis Pancong
  IF cat_minuman_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Es Teh Manis Segar') THEN
    INSERT INTO public.products (category_id, name, description, image_url, base_price, is_active)
    VALUES (
      cat_minuman_id,
      'Es Teh Manis Segar',
      'Es teh manis penyegar setelah pancong lumer.',
      'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=500&q=80',
      5000.00,
      TRUE
    ) RETURNING id INTO p_es_teh_id;

    INSERT INTO public.product_variants (product_id, variant_type, name, additional_price) VALUES
      (p_es_teh_id, 'ukuran', 'Regular', 0.00),
      (p_es_teh_id, 'ukuran', 'Jumbo 22oz', 3000.00);
  END IF;

END $$;
