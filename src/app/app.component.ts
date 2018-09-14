import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Sort } from '@angular/material';
import { FormControl } from '@angular/forms';

export interface Game {
  name: string;
  price: number;
  normal_price: number;
  plus_price: number;
  platform: string;
  type: string;
}

@Component({
  selector:    'app-root',
  templateUrl: './app.component.html',
  styleUrls:   ['./app.component.css']
})
export class AppComponent {

  toppings = new FormControl();

  games: Game[]               = [];
  sortedData: Game[]          = [];
  shoppingCart: Game[]        = [];
  trashCart: Game[]           = [];
  combination: Array<any>     = [];
  gameName: Array<string>     = [];
  jsonList: Array<string>     = [
    'game_50.json',
    'game_100.json',
    'game_150.json',
    'game_200.json',
    'game_250.json',
    'game_300.json',
    'game_350.json',
    'game_400.json',
    'dlc_50.json',
    'dlc_100.json',
  ];
  platformList: Array<string> = [
    'PS4',
    '遊戲 GAME',
    '追加內容 DLC',
    'PS3',
    'PS Vita',
  ];
  targetPrice                 = 2200;
  totalPrice                  = 0;
  limit                       = 20;
  message                     = '';
  isPlus                      = true;

  constructor(
    private http: HttpClient
  ) {
    this.toppings.setValue(['PS4', '遊戲 GAME']);
    this.isPlus = localStorage.getItem('is-plus') !== 'false';

    this.getGameList();
  }

  calculator() {
    this.message     = '';
    this.combination = [];
    if (this.totalPrice > this.targetPrice) {
      this.message = `購物車金額 ${this.totalPrice}元，超過目標金額 ${this.targetPrice}元`;
    } else if (this.totalPrice === this.targetPrice) {
      this.message = `你已經挑好 ${this.targetPrice}元了`;
    } else {
      const games = this.sortedData.filter((game) => (
        this.trashCart.find(target => target.name === game.name) === undefined
      )).filter((game) => (
        this.shoppingCart.find(target => target.name === game.name) === undefined
      ));

      const targetPrice = this.targetPrice - this.totalPrice;
      const priceList   = [];
      games.forEach((game) => {
        if (game.price <= targetPrice && priceList.indexOf(game.price) < 0) {
          priceList.push(game.price);
        }
      });
      priceList.sort((a, b) => (a - b));

      this.combination = this.getSummingItems(priceList, targetPrice);

      if (this.combination === undefined || this.combination.length === 0) {
        this.message = '抱歉捏，湊不到整數。';
      } else {
        this.message = this.combination.filter((combination, index) => index < this.limit)
          .map((combination, index) => {
            const set: Array<string> = combination.map((price) => {
              const priceMatchGames = games.filter((game) => (game.price === price));
              if (priceMatchGames.length === 1) {
                const game = priceMatchGames[0];
                return `${game.price} : ${game.name}`;
              }

              return `${priceMatchGames[0].price}: ${priceMatchGames.map((game) => game.name).join(' /\r\n     ')}`;
            });
            set.unshift(`第${index + 1}種組合`);
            set.push('');

            return set.join('\r\n');
          }).join('\r\n');
      }
    }
  }

  getSummingItems(priceList, targetPrice) {
    const summingItems = [];

    for (let size = 1; size <= 4; size++) {
      const subSets = [];
      this.getCombinations(priceList, size, 0, [], subSets);
      if (subSets.length) {
        subSets.filter((subset) => (
          subset.reduce((a, b) => a + b, 0) === targetPrice
        )).forEach((subset) => {
          summingItems.push(subset);
        });
      }

      if (summingItems.length >= this.limit) {
        break;
      }
    }

    return summingItems;
  }

  getCombinations(priceList, setSize, start, initialStuff, output) {
    if (initialStuff.length >= setSize) {
      output.push(initialStuff);
    } else {
      for (let i = start; i < priceList.length; ++i) {
        this.getCombinations(priceList, setSize, i + 1, initialStuff.concat(priceList[i]), output);
      }
    }
  }

  getPrice() {
    if (this.shoppingCart.length === 0) {
      return '';
    }
    this.totalPrice = 0;

    this.shoppingCart.forEach((game) => {
      this.totalPrice += game.price;
    });

    return `已選購金額：${this.totalPrice}`;
  }

  getCart() {
    if (this.shoppingCart.length === 0) {
      return '';
    }
    const games: string[] = [];

    this.shoppingCart.forEach((game) => {
      games.push(`${game.price} : ${game.name}`);
    });

    return games.join('\r\n');
  }

  getCount() {
    if (!this.combination || this.combination.length === 0) {
      return '';
    }

    let count = `一共有${this.combination.length}種組合`;
    if (this.combination.length > this.limit) {
      count = `組合太多了，只顯示其中的${this.limit}種。`;
    }

    return count;
  }

  platformSelectionChange() {
    const platforms = this.toppings.value.filter((platform) => platform === 'PS4' || platform === 'PS3' || platform === 'PS Vita');
    const includeGame = this.toppings.value.find((type) => type === '遊戲 GAME') !== undefined;
    const includeDlc = this.toppings.value.find((type) => type === '追加內容 DLC') !== undefined;

    this.sortedData = this.games.filter((game) => (
      (game.type === 'game' && includeGame) || (game.type === 'dlc' && includeDlc)
    )).filter((game) => (
      platforms.indexOf(game.platform) >= 0
    )).slice();
  }

  onIsPlusChange(event): void {
    this.isPlus = event.checked;
    localStorage.setItem('is-plus', String(this.isPlus));

    this.sortedData.forEach((game) => {
      game.price = this.isPlus ? game.plus_price : game.normal_price;
    });
  }

  getResult() {
    return this.message;
  }

  reset() {
    window.location.reload();
  }

  getGameList() {
    if (this.jsonList.length === 0) {
      this.sortedData = this.games.filter((game) => (
        this.toppings.value.indexOf(game.platform) >= 0
      )).slice();
      return;
    }
    const filename = this.jsonList.shift();
    this.http.get(`./assets/${filename}`).subscribe((result: Array<any>) => {
      const typeGame = filename.indexOf('game') === 0;
      const typeDlc  = filename.indexOf('dlc') === 0;
      result['included'].forEach((item) => {
        const attributes = item['attributes'];
        if ((typeGame && item['type'] === 'game') || (typeDlc && item['type'] === 'game-related') && attributes['skus']) {
          const skus = attributes['skus'].pop();
          const name = `${attributes['name']}  (${skus['name']})`;

          if (this.gameName.indexOf(name) < 0) {
            this.gameName.push(name);

            const normal_price = skus['prices']['non-plus-user']['actual-price']['value'] / 100;
            const plus_price   = skus['prices']['plus-user']['actual-price']['value'] / 100;
            const price        = this.isPlus ? plus_price : normal_price;

            if (price > 0) {
              this.games.push({
                name:         name,
                price:        price,
                normal_price: normal_price,
                plus_price:   plus_price,
                platform:     attributes['platforms'].pop(),
                type:         typeDlc ? 'dlc' : 'game',
              });
            }
          }
        }
      });
      this.getGameList();
    });
  }

  sortData(sort: Sort) {
    const data = this.games.slice();
    if (!sort.active || sort.direction === '') {
      this.sortedData = data;
      return;
    }

    this.sortedData = data.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'name':
          return compare(a.name, b.name, isAsc);
        case 'price':
          return compare(a.price, b.price, isAsc);
        default:
          return 0;
      }
    });
  }

  include(name) {
    const target = this.games.find(game => game.name === name);

    this.shoppingCart.push(target);

    const exclude = this.trashCart.find(game => game.name === name);
    if (exclude && this.trashCart.indexOf(exclude) >= 0) {
      this.trashCart.splice(this.trashCart.indexOf(exclude), 1);
    }
  }

  exclude(name) {
    const target = this.games.find(game => game.name === name);

    this.trashCart.push(target);

    const include = this.shoppingCart.find(game => game.name === name);
    if (include && this.shoppingCart.indexOf(include) >= 0) {
      this.shoppingCart.splice(this.shoppingCart.indexOf(include), 1);
    }
  }
}

function compare(a, b, isAsc) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
