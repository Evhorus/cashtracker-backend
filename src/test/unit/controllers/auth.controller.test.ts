import { createRequest, createResponse } from 'node-mocks-http';
import { AuthController } from '../../../controllers/auth.controller';
import User from '../../../models/user.model';
import { checkPassword, hashPassword } from '../../../utils/auth';
import { generateToken } from '../../../utils/token';
import { AuthEmail } from '../../../emails/auth.email';
import { generateJWT } from '../../../utils/jwt';

jest.mock('../../../models/user.model');
jest.mock('../../../utils/auth');
jest.mock('../../../utils/token');
jest.mock('../../../utils/jwt');

describe('AuthController.createAccount', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return a 409 and error message if the email is already registered', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(true);

    const userData = {
      name: 'test',
      email: 'test@test.com',
      password: 'testPassword',
    };

    const req = createRequest({
      method: 'POST',
      url: '/api/v1/auth/create-account',
      body: userData,
    });
    const res = createResponse();

    await AuthController.createAccount(req, res);

    const data = res._getJSONData();

    expect(res.statusCode).toBe(409);
    expect(data).toEqual({
      error: `A user with the email ${userData.email} is already registered`,
    });
    expect(User.findOne).toHaveBeenCalled();
    expect(User.findOne).toHaveBeenCalledTimes(1);
  });

  it('should register a new user and return a success message', async () => {
    const bodyData = {
      name: 'test',
      email: 'test@test.com',
      password: 'testPassword',
    };

    const req = createRequest({
      method: 'POST',
      url: '/api/v1/auth/create-account',
      body: bodyData,
    });
    const res = createResponse();

    const mockUser = { ...req.body, save: jest.fn() };

    (User.create as jest.Mock).mockResolvedValue(mockUser);
    (hashPassword as jest.Mock).mockReturnValue('hashedpassword');
    (generateToken as jest.Mock).mockReturnValue('123456');
    jest
      .spyOn(AuthEmail, 'sendConfirmationEmail')
      .mockImplementation(() => Promise.resolve());

    await AuthController.createAccount(req, res);

    const data = res._getJSONData();
    expect(res.statusCode).toBe(201);
    expect(User.create).toHaveBeenCalledWith(req.body);
    expect(User.create).toHaveBeenCalledTimes(1);
    expect(mockUser.save).toHaveBeenCalled();
    expect(mockUser.password).toBe('hashedpassword');
    expect(mockUser.token).toBe('123456');
    expect(AuthEmail.sendConfirmationEmail).toHaveBeenCalledWith({
      name: bodyData.name,
      email: bodyData.email,
      token: '123456',
    });
    expect(AuthEmail.sendConfirmationEmail).toHaveBeenCalledTimes(1);
    expect(data).toBe('Account created successfully');
  });
});

describe('AuthController.login', () => {
  it('should return 404 if user not found', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
    const bodyData = {
      email: 'test@test.com',
      password: 'testPassword',
    };
    const req = createRequest({
      method: 'POST',
      url: '/api/v1/auth/login',
      body: bodyData,
    });
    const res = createResponse();

    await AuthController.login(req, res);

    const data = res._getJSONData();

    expect(res.statusCode).toBe(404);
    expect(data).toEqual({
      error: `User with email ${bodyData.email} not found`,
    });
  });

  it('should return 403 if the account has not been confirmed', async () => {
    const bodyData = {
      email: 'test@test.com',
      password: 'testPassword',
    };
    (User.findOne as jest.Mock).mockResolvedValue({
      id: 1,
      email: bodyData.email,
      password: bodyData.password,
      confirmed: false,
    });

    const req = createRequest({
      method: 'POST',
      url: '/api/v1/auth/login',
      body: bodyData,
    });
    const res = createResponse();

    await AuthController.login(req, res);

    const data = res._getJSONData();

    expect(res.statusCode).toBe(403);
    expect(data).toEqual({
      error: `The account has not been confirmed`,
    });
  });

  it('should return 401 if the password is incorrect', async () => {
    const bodyData = {
      email: 'test@test.com',
      password: 'testPassword',
    };

    const userMock = {
      id: 1,
      email: bodyData.email,
      password: bodyData.password,
      confirmed: true,
    };
    (User.findOne as jest.Mock).mockResolvedValue(userMock);

    const req = createRequest({
      method: 'POST',
      url: '/api/v1/auth/login',
      body: bodyData,
    });
    const res = createResponse();

    (checkPassword as jest.Mock).mockResolvedValue(false);

    await AuthController.login(req, res);

    const data = res._getJSONData();

    expect(res.statusCode).toBe(401);
    expect(data).toEqual({
      error: `Incorrect password or email`,
    });
    expect(checkPassword).toHaveBeenCalledWith(
      req.body.password,
      userMock.password,
    );
    expect(checkPassword).toHaveBeenCalledTimes(1);
  });

  it('should return a JWT if authentication is successful', async () => {
    const bodyData = {
      email: 'test@test.com',
      password: 'testPassword',
    };

    const userMock = {
      id: 1,
      email: bodyData.email,
      password: 'hashed_password',
      confirmed: true,
    };

    const req = createRequest({
      method: 'POST',
      url: '/api/v1/auth/login',
      body: bodyData,
    });
    const res = createResponse();
    const fakeJWT = 'fake_jwt';
    (User.findOne as jest.Mock).mockResolvedValue(userMock);
    (checkPassword as jest.Mock).mockResolvedValue(true);
    (generateJWT as jest.Mock).mockReturnValueOnce(fakeJWT);

    await AuthController.login(req, res);

    const data = res._getJSONData();

    expect(res.statusCode).toBe(200);
    expect(data).toEqual('fake_jwt');
    expect(generateJWT).toHaveBeenCalledTimes(1);
    expect(generateJWT).toHaveBeenCalledWith(userMock.id);
  });
});