# Product specification

## 1. Проблема

Пользователю сложно представить будущий интерьер по словам, moodboard или отдельным образцам материалов. До начала ремонта ему нужен быстрый способ увидеть несколько направлений **на фотографии собственного помещения** и выбрать, что обсуждать дальше.

AIDIX сокращает путь от «не понимаю, как будет выглядеть» до набора визуальных концепций.

## 2. Target users

MVP оптимизируется прежде всего для B2C:

- владелец квартиры/дома перед ремонтом;
- человек, выбирающий стиль новой квартиры;
- пользователь, который хочет согласовать идею с семьёй/подрядчиком.

Secondary users без отдельного UX в MVP:

- интерьерные дизайнеры для быстрых концептов;
- риелторы/хоумстейджеры;
- небольшие ремонтные компании.

Командные accounts, client workspaces и B2B billing не входят в MVP.

## 3. Product promise

AIDIX обещает:

- использовать реальное фото пользователя как основу;
- сохранять общую композицию/ракурс и стараться не менять отмеченные пользователем immutable elements;
- генерировать несколько visually coherent вариантов выбранного стиля;
- давать простой способ повторить генерацию с другими пожеланиями.

AIDIX **не обещает**:

- сантиметровую точность;
- правильную инженерную разводку;
- физически точные размеры мебели;
- строительную реализуемость;
- точное совпадение товара по SKU;
- полноценный рабочий проект.

## 4. MVP scope

### 4.1 Account and authentication

Для запуска генерации требуется account.

MVP authentication — **passwordless email OTP** через Better Auth:

1. пользователь вводит email;
2. система отправляет одноразовый код на этот адрес;
3. пользователь вводит код;
4. успешная проверка кода создаёт/подтверждает account при первом входе либо открывает существующую session;
5. password authentication в MVP не используется.

Конкретный transactional email provider для доставки OTP — `TBD` и должен быть отдельно утверждён владельцем продукта. Product code не должен привязывать auth domain к конкретному email vendor.

Future auth:

- social login planned после MVP/по отдельному решению;
- конкретные social providers (`Google`, `VK`, `Yandex`, etc.) не выбраны и остаются `TBD` до explicit owner decision.

После первого eligible подтверждённого account пользователь получает **3 promotional credits** ровно один раз. В пользовательском интерфейсе это представляется как **3 бесплатные генерации**.

Один standard generated variant расходует `1 credit`. Следовательно, стартовые 3 promotional credits можно использовать как три одиночные генерации либо распределить на multi-variant request, где каждый requested variant расходует отдельный credit.

### 4.2 Project

Project — пользовательская папка одного помещения/задачи.

Минимальные поля:

- name;
- optional roomType default;
- createdAt/updatedAt.

Один project может содержать несколько source photos и generations, но MVP generator работает с одной source photo на одну generation.

### 4.3 Generation flow

Required:

1. source photo;
2. room type;
3. style;
4. output count `1..4`.

Optional:

- free-form wishes;
- `keep unchanged` text;
- до 3 reference images с ролью `STYLE`, `FURNITURE`, `MATERIAL`.

Generation создаёт requested number вариантов как отдельные `GenerationVariant`, объединённые одной `Generation` request.

### 4.4 Room types

Initial catalog:

- living_room;
- bedroom;
- kitchen;
- bathroom;
- kids_room;
- home_office;
- hallway;
- dining_room;
- studio;
- other.

Catalog хранится в code/config, а не user-editable database table в MVP.

### 4.5 Styles

Initial curated set:

- modern;
- scandinavian;
- minimalism;
- loft;
- japandi;
- neoclassic;
- classic;
- contemporary;
- mid_century;
- wabi_sabi;
- industrial;
- cozy.

Style — не только label. Каждый style имеет versioned prompt recipe и preview asset.

### 4.6 Input photo requirements

UI принимает JPEG/PNG/WebP до 15 MB.

Перед generation приложение:

- валидирует MIME по содержимому, а не только extension;
- проверяет декодирование изображения;
- удаляет EXIF metadata при normalization;
- нормализует orientation;
- создаёт provider-ready derivative с разумным max dimension;
- сохраняет original отдельно, если storage policy это допускает.

UI рекомендует:

- один понятный ракурс комнаты;
- стены/пол/потолок по возможности в кадре;
- достаточное освещение;
- минимум людей;
- отсутствие сильного motion blur.

Слабое фото не блокируется автоматически, если технически валидно; пользователь получает warning.

## 5. Generation semantics

### 5.1 Operation `REDESIGN_PHOTO`

Единственная production generation operation MVP.

Основной provider input:

1. normalized source photo — first image;
2. references — subsequent images;
3. structured prompt.

Prompt обязан явно требовать сохранить perspective, room envelope и immutable elements, но продукт не утверждает, что provider выполнит это идеально.

### 5.2 Variants

`variantCount` означает количество независимых provider outputs. Не просить provider сделать collage из нескольких вариантов.

Каждый вариант имеет собственный provider request/result metadata и может success/fail независимо. Parent Generation:

- `SUCCEEDED`, если все requested variants завершены успешно;
- `PARTIAL`, если хотя бы один success и хотя бы один terminal failure;
- `FAILED`, если ни одного success.

Credit policy описана в billing/domain.

### 5.3 Re-run

Пользователь может выбрать successful variant как new source и создать новую generation. Это новая billable operation и новый lineage edge.

MVP не использует скрытую conversational state provider. Каждый request должен быть reproducible из persisted AIDIX inputs.

## 6. Post-generation MVP

Result screen предоставляет:

- before/after compare;
- grid вариантов;
- download successful result;
- favorite one variant;
- create another generation with copied settings;
- use result as next source.

Mask-based local editor и upscale в initial MVP не блокируют launch.

## 7. V1.1

После подтверждения photo-redesign quality:

- mask-based local edit;
- dedicated `change wall/floor/furniture` operations;
- upscale/download 2K+;
- richer reference handling;
- simple gallery/history filters;
- optional text-to-interior mode.

## 8. План помещения

Boss requirement «фото или план помещения» сохраняется как planned capability, но не смешивается с MVP photo-redesign.

`PLAN_CONCEPT` должен пройти отдельный quality spike. Его обещание формулируется как **концептуальная визуализация по плану**, а не точное автоматическое построение перспективного 3D-проекта.

До прохождения spike landing не утверждает, что AIDIX надёжно строит интерьер по floor plan.

## 9. 3D

3D visualization — отдельный продуктовый/технический модуль. Он не реализуется через простой вызов image generator.

Возможный future pipeline требует исследования:

- room geometry reconstruction;
- depth/segmentation;
- camera calibration;
- mesh/scene generation;
- asset placement;
- renderer/web viewer.

До отдельного решения 3D не показывается как «coming soon» с датой и не влияет на текущую schema.

## 10. Materials/furniture matching

MVP поддерживает visual references, но не гарантирует точный SKU.

Future commerce/catalog feature потребует отдельной модели данных: retailer, SKU, dimensions, price, availability, image rights и matching confidence.

## 11. AI limitations copy

На generation/result surfaces должна быть короткая формулировка:

> Визуализация создаётся ИИ и может искажать размеры, детали и материалы. Проверяйте реальные размеры и технические решения перед ремонтом или покупкой.

Landing содержит расширенное объяснение ограничений.

## 12. Success metrics

Начальные product metrics:

- landing -> generator/account conversion;
- first successful OTP sign-in -> first generation started;
- first generation success rate;
- time to first successful result;
- generation -> download rate;
- generation -> rerun rate;
- free promotional credits -> paid purchase conversion;
- technical provider failure rate.

Не использовать «AI quality score» как единственную product metric. Нужны реальные user actions.
