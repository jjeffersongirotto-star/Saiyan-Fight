// Phaser só com o que o jogo usa (v0.145): sem física (Arcade/Matter), tilemaps, som do Phaser (o som é nosso, sintetizado)
// e sem os objetos que nenhuma cena cria (BitmapText, Mesh, Video, Rope...). Entra no lugar de 'phaser' só no build
// (vite.config.ts); no `npm run dev` e nos tipos continua o Phaser inteiro. Mesmo formato do src/phaser.js da biblioteca.
// Novo objeto do Phaser numa cena (this.add.xxx) = pôr a classe + a Factory (+ Creator) aqui.
import 'phaser/src/polyfills/requestVideoFrame';
import CONST from 'phaser/src/const';
import Extend from 'phaser/src/utils/object/Extend';

import Actions from 'phaser/src/actions';
import Animations from 'phaser/src/animations';
import BlendModes from 'phaser/src/renderer/BlendModes';
import Cache from 'phaser/src/cache';
import Cameras from 'phaser/src/cameras';
import Core from 'phaser/src/core';
import Class from 'phaser/src/utils/Class';
import Create from 'phaser/src/create';
import Curves from 'phaser/src/curves';
import Data from 'phaser/src/data';
import Display from 'phaser/src/display';
import DOM from 'phaser/src/dom';
import Events from 'phaser/src/events';
import FX from 'phaser/src/fx';
import Game from 'phaser/src/core/Game';
import Geom from 'phaser/src/geom';
import Input from 'phaser/src/input';
import Loader from 'phaser/src/loader';
import PMath from 'phaser/src/math';
import Plugins from 'phaser/src/plugins';
import Renderer from 'phaser/src/renderer';
import Scale from 'phaser/src/scale';
import ScaleModes from 'phaser/src/renderer/ScaleModes';
import Scene from 'phaser/src/scene/Scene';
import Scenes from 'phaser/src/scene';
import Structs from 'phaser/src/structs';
import Textures from 'phaser/src/textures';
import Time from 'phaser/src/time';
import Tweens from 'phaser/src/tweens';
import Utils from 'phaser/src/utils';

import GOEvents from 'phaser/src/gameobjects/events';
import DisplayList from 'phaser/src/gameobjects/DisplayList';
import GameObjectCreator from 'phaser/src/gameobjects/GameObjectCreator';
import GameObjectFactory from 'phaser/src/gameobjects/GameObjectFactory';
import UpdateList from 'phaser/src/gameobjects/UpdateList';
import Components from 'phaser/src/gameobjects/components';
import GetCalcMatrix from 'phaser/src/gameobjects/GetCalcMatrix';
import BuildGameObject from 'phaser/src/gameobjects/BuildGameObject';
import BuildGameObjectAnimation from 'phaser/src/gameobjects/BuildGameObjectAnimation';
import GameObject from 'phaser/src/gameobjects/GameObject';
import Container from 'phaser/src/gameobjects/container/Container';
import Graphics from 'phaser/src/gameobjects/graphics/Graphics';
import Image from 'phaser/src/gameobjects/image/Image';
import Layer from 'phaser/src/gameobjects/layer/Layer';
import Particles from 'phaser/src/gameobjects/particles';
import Sprite from 'phaser/src/gameobjects/sprite/Sprite';
import Text from 'phaser/src/gameobjects/text/Text';
import Zone from 'phaser/src/gameobjects/zone/Zone';
import Shape from 'phaser/src/gameobjects/shape/Shape';
import Arc from 'phaser/src/gameobjects/shape/arc/Arc';
import Rectangle from 'phaser/src/gameobjects/shape/rectangle/Rectangle';
import LightsPlugin from 'phaser/src/gameobjects/lights/LightsPlugin';
import LightsManager from 'phaser/src/gameobjects/lights/LightsManager';
import Light from 'phaser/src/gameobjects/lights/Light';
// as Factories/Creators se registram no this.add / this.make ao serem importadas
import FContainer from 'phaser/src/gameobjects/container/ContainerFactory';
import FGraphics from 'phaser/src/gameobjects/graphics/GraphicsFactory';
import FImage from 'phaser/src/gameobjects/image/ImageFactory';
import FLayer from 'phaser/src/gameobjects/layer/LayerFactory';
import FParticles from 'phaser/src/gameobjects/particles/ParticleEmitterFactory';
import FSprite from 'phaser/src/gameobjects/sprite/SpriteFactory';
import FText from 'phaser/src/gameobjects/text/TextFactory';
import FZone from 'phaser/src/gameobjects/zone/ZoneFactory';
import FArc from 'phaser/src/gameobjects/shape/arc/ArcFactory';
import FRectangle from 'phaser/src/gameobjects/shape/rectangle/RectangleFactory';
import CContainer from 'phaser/src/gameobjects/container/ContainerCreator';
import CGraphics from 'phaser/src/gameobjects/graphics/GraphicsCreator';
import CImage from 'phaser/src/gameobjects/image/ImageCreator';
import CLayer from 'phaser/src/gameobjects/layer/LayerCreator';
import CParticles from 'phaser/src/gameobjects/particles/ParticleEmitterCreator';
import CSprite from 'phaser/src/gameobjects/sprite/SpriteCreator';
import CText from 'phaser/src/gameobjects/text/TextCreator';
import CZone from 'phaser/src/gameobjects/zone/ZoneCreator';

const GameObjects = {
  Events: GOEvents, DisplayList, GameObjectCreator, GameObjectFactory, UpdateList, Components, GetCalcMatrix,
  BuildGameObject, BuildGameObjectAnimation, GameObject,
  Container, Graphics, Image, Layer, Particles, Sprite, Text, Zone, Shape, Arc, Rectangle, LightsPlugin, LightsManager, Light,
  Factories: { Container: FContainer, Graphics: FGraphics, Image: FImage, Layer: FLayer, Particles: FParticles, Sprite: FSprite, Text: FText, Zone: FZone, Arc: FArc, Rectangle: FRectangle },
  Creators: { Container: CContainer, Graphics: CGraphics, Image: CImage, Layer: CLayer, Particles: CParticles, Sprite: CSprite, Text: CText, Zone: CZone },
};

let Phaser = {
  Actions, Animations, BlendModes, Cache, Cameras, Core, Class, Create, Curves, Data, Display, DOM, Events, FX, Game,
  GameObjects, Geom, Input, Loader, Math: PMath, Plugins, Renderer, Scale, ScaleModes, Scene, Scenes, Structs, Textures,
  Time, Tweens, Utils,
};
Phaser = Extend(false, Phaser, CONST);
globalThis.Phaser = Phaser;
export default Phaser;
